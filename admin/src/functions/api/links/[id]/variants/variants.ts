import { Context, Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { eq, and, isNull, ne } from 'drizzle-orm/expressions';
import { links, destinationHistory } from '../../db';
import { applyRateLimit } from '../../rate-limit';

const app = new Hono();
applyRateLimit(app);

// PATCH /api/links/{id}/variants - Bulk update destination URLs for all variants
app.patch('/', async (c) => {
  try {
    const slug = c.req.param('id');
    const { destination_url } = await c.req.json();
    const user = c.get('user');

    // Validate input
    if (!destination_url) {
      return c.json(
        { error: 'Destination URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(destination_url);
    } catch {
      return c.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

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

    // Get the base link ID
    const baseLinkId = await c.env.DB.prepare(`
      SELECT id FROM links WHERE slug = ? AND status != 'deleted'
    `).bind(slug).first();

    if (!baseLinkId) {
      return c.json(
        { error: 'Base link not found' },
        { status: 404 }
      );
    }

    // Get all active variants
    const variants = await c.env.DB.prepare(`
      SELECT * FROM links
      WHERE variant_of = ? AND status != 'deleted'
    `).bind(baseLinkId.id).all();

    if (variants.length === 0) {
      return c.json(
        { error: 'No variants found for this link' },
        { status: 404 }
      );
    }

    // Update all variants
    const updatedVariants = [];
    const now = new Date().toISOString();

    for (const variant of variants) {
      // Check if destination has changed
      if (variant.destination_url !== destination_url) {
        // Update variant
        await c.env.DB.prepare(`
          UPDATE links SET
            destination_url = ?,
            updated_at = ?,
            updated_by = ?
          WHERE id = ?
        `).bind(
          destination_url,
          now,
          user?.email || 'unknown',
          variant.id
        ).run();

        updatedVariants.push({
          id: variant.id,
          slug: variant.slug,
          old_destination: variant.destination_url,
          new_destination: destination_url
        });

        // Record in destination history
        await c.env.DB.prepare(`
          INSERT INTO destination_history (
            slug, old_destination, new_destination, changed_by
          ) VALUES (?, ?, ?, ?)
        `).bind(
          variant.slug,
          variant.destination_url,
          destination_url,
          user?.email || 'unknown'
        ).run();
      }
    }

    return c.json({
      success: true,
      data: {
        base_link: {
          id: baseLink.id,
          slug: baseLink.slug
        },
        updated_variants: updatedVariants,
        total_variants: variants.length,
        updated_count: updatedVariants.length
      }
    });
  } catch (error) {
    console.error('Error updating variants:', error);
    return c.json(
      { error: 'Failed to update variants' },
      { status: 500 }
    );
  }
});

export default app;