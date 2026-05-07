import { Context, Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { eq, and, isNull, ne } from 'drizzle-orm/expressions';
import { links, variantGenerations } from '../../db';
import { SOCIAL_VARIANT_SUFFIX_MAP, SOCIAL_PLATFORM_UTM_SOURCE_MAP } from '@rovrs/shared';
import { applyRateLimit } from '../../rate-limit';

const app = new Hono();
applyRateLimit(app);

// POST /api/links/{id}/variants - Generate social variants for a base link
app.post('/', async (c) => {
  try {
    const slug = c.req.param('id');
    const user = c.get('user');

    // Get the base link
    const baseLink = await c.env.DB.prepare(`
      SELECT * FROM links WHERE slug = ? AND status != 'deleted'
    `).bind(slug).first();

    if (!baseLink) {
      return c.json(
        { error: 'Base link not found' },
        { status: 404 }
      );
    }

    // Get the base link ID for variant relationship
    const baseLinkId = await c.env.DB.prepare(`
      SELECT id FROM links WHERE slug = ? AND status != 'deleted'
    `).bind(slug).first();

    if (!baseLinkId) {
      return c.json(
        { error: 'Base link not found' },
        { status: 404 }
      );
    }

    // Check if link already has variants
    const existingVariants = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM links
      WHERE variant_of = ? AND status != 'deleted'
    `).bind(baseLinkId.id).first();

    if (parseInt(existingVariants.count) > 0) {
      return c.json(
        { error: 'Variants already exist for this link' },
        { status: 409 }
      );
    }

    // Generate social variants
    const variants = [];
    const variantSlugs = [];
    const now = new Date().toISOString();

    for (const [platform, suffix] of Object.entries(SOCIAL_VARIANT_SUFFIX_MAP)) {
      const variantSlug = `${baseLink.slug}${suffix}`;

      // Check if variant slug already exists
      const existingVariant = await c.env.DB.prepare(`
        SELECT slug FROM links WHERE slug = ? AND status != 'deleted'
      `).bind(variantSlug).first();

      if (existingVariant) {
        continue; // Skip if slug already exists
      }

      // Create variant
      const result = await c.env.DB.prepare(`
        INSERT INTO links (
          slug, destination_url, title, campaign, channel,
          status, redirect_code, is_qr, is_offsite_ticket, show_offsite_preview,
          expires_at, notes, created_at, updated_at, created_by, updated_by,
          variant_of, variant_suffix
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).bind(
        variantSlug,
        baseLink.destination_url,
        baseLink.title,
        baseLink.campaign,
        'social',
        'active',
        baseLink.redirect_code,
        baseLink.is_qr ? 1 : 0,
        baseLink.show_offsite_preview ? 1 : 0,
        baseLink.show_offsite_preview ? 1 : 0,
        baseLink.expires_at,
        `Social variant for ${platform}`,
        now,
        now,
        user?.email || 'unknown',
        user?.email || 'unknown',
        baseLinkId.id,
        suffix
      ).run();

      variants.push({
        id: result.meta.last_row_id,
        slug: variantSlug,
        platform,
        utm_source: SOCIAL_PLATFORM_UTM_SOURCE_MAP[platform as keyof typeof SOCIAL_PLATFORM_UTM_SOURCE_MAP]
      });
      variantSlugs.push(variantSlug);
    }

    // Record the generation
    if (variants.length > 0) {
      await c.env.DB.prepare(`
        INSERT INTO variant_generations (
          base_link_id, variant_type, variant_slugs, created_by
        ) VALUES (?, ?, ?, ?)
      `).bind(
        baseLinkId.id,
        'social',
        JSON.stringify(variantSlugs),
        user?.email || 'unknown'
      ).run();
    }

    return c.json({
      success: true,
      data: {
        base_link: {
          id: baseLink.id,
          slug: baseLink.slug,
          destination_url: baseLink.destination_url
        },
        variants: variants,
        generated_count: variants.length
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating variants:', error);
    return c.json(
      { error: 'Failed to generate variants' },
      { status: 500 }
    );
  }
});

export default app;