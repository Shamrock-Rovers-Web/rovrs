import { Context, Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { eq, or, desc, ilike, and, isNull, lt } from 'drizzle-orm/expressions';
import { links, clickEvents } from '../schema';
import { validateLinkInput, validateUpdateInput, LinkCreateInput, LinkUpdateInput } from '@rovrs/shared';
import { applyRateLimit } from '../rate-limit';

const app = new Hono();
applyRateLimit(app);

// GET /api/links - List links with search, filter, and pagination
app.get('/', async (c) => {
  try {
    const {
      search = '',
      status = '',
      channel = '',
      campaign = '',
      limit = 20,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = c.req.query();

    // Validate limit and offset
    const validatedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const validatedOffset = Math.max(parseInt(offset) || 0, 0);

    // Build query conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(links.status, status));
    }

    if (channel) {
      conditions.push(eq(links.channel, channel));
    }

    if (campaign) {
      conditions.push(eq(links.campaign, campaign));
    }

    if (search) {
      conditions.push(
        or(
          ilike(links.slug, `%${search}%`),
          ilike(links.destination_url, `%${search}%`),
          ilike(links.title, `%${search}%`)
        )
      );
    }

    // Filter out deleted links by default
    conditions.push(or(isNull(links.deleted_at), eq(links.status, 'active')));

    // Build sort conditions
    const sortByMap = {
      'created_at': links.created_at,
      'updated_at': links.updated_at,
      'clicks': sql`(SELECT COUNT(*) FROM click_events WHERE slug = links.slug)`,
      'expires_at': links.expires_at
    };

    const sortBy = sortByMap[sort_by as keyof typeof sortByMap] || links.created_at;
    const sortOrder = sort_order === 'asc' ? 'asc' : 'desc';

    // Get total count
    const [{ count: totalCount }] = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM links
      WHERE ${conditions.length > 0 ? conditions.join(' AND ') : '1=1'}
    `).all();

    // Get links with click count
    const linksData = await c.env.DB.prepare(`
      SELECT
        l.*,
        (SELECT COUNT(*) FROM click_events WHERE slug = l.slug) as click_count
      FROM links l
      WHERE ${conditions.length > 0 ? conditions.join(' AND ') : '1=1'}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `).bind(validatedLimit, validatedOffset).all();

    // Format response
    const formattedLinks = linksData.map(link => ({
      ...link,
      expires_at: link.expires_at || null,
      created_at: link.created_at,
      updated_at: link.updated_at || null,
      click_count: parseInt(link.click_count || 0)
    }));

    return c.json({
      success: true,
      data: formattedLinks,
      pagination: {
        total: parseInt(totalCount),
        limit: validatedLimit,
        offset: validatedOffset,
        has_more: validatedOffset + validatedLimit < parseInt(totalCount)
      }
    });
  } catch (error) {
    console.error('Error fetching links:', error);
    return c.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
});

// POST /api/links - Create new link
app.post('/', async (c) => {
  try {
    const input = await c.req.json<LinkCreateInput>();

    // Validate input
    const errors = validateLinkInput(input);
    if (errors.length > 0) {
      return c.json(
        {
          success: false,
          error: 'Validation failed',
          errors
        },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingLink = await c.env.DB.prepare(`
      SELECT slug FROM links WHERE slug = ? AND status != 'deleted'
    `).bind(input.slug).first();

    if (existingLink) {
      return c.json(
        {
          success: false,
          error: 'Slug already exists'
        },
        { status: 409 }
      );
    }

    // Parse domain from destination URL
    let destinationDomain = '';
    try {
      const url = new URL(input.destination_url);
      destinationDomain = url.hostname;
    } catch {
      // Use domain extraction fallback
      const match = input.destination_url.match(/https?:\/\/([^\/]+)/);
      if (match) {
        destinationDomain = match[1];
      }
    }

    // Create link
    const now = new Date().toISOString();
    const result = await c.env.DB.prepare(`
      INSERT INTO links (
        slug, destination_url, destination_domain, title, campaign, channel,
        owner, sponsor, opponent, competition, match_date, home_away,
        status, redirect_code, is_qr, is_offsite_ticket, show_offsite_preview,
        expires_at, notes, created_at, updated_at, created_by, updated_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).bind(
      input.slug,
      input.destination_url,
      destinationDomain,
      input.title || null,
      input.campaign || null,
      input.channel || null,
      input.owner || null,
      input.sponsor || null,
      input.opponent || null,
      input.competition || null,
      input.match_date || null,
      input.home_away || null,
      input.status || 'active',
      input.redirect_code || 302,
      input.is_qr || false,
      input.is_offsite_ticket || false,
      input.show_offsite_preview || false,
      input.expires_at || null,
      input.notes || null,
      now,
      now,
      c.get('user')?.email || 'unknown',
      c.get('user')?.email || 'unknown'
    ).run();

    // Get the created link
    const createdLink = await c.env.DB.prepare(`
      SELECT
        l.*,
        (SELECT COUNT(*) FROM click_events WHERE slug = l.slug) as click_count
      FROM links l
      WHERE l.rowid = ?
    `).bind(result.meta.last_row_id).first();

    return c.json({
      success: true,
      data: {
        ...createdLink,
        expires_at: createdLink.expires_at || null,
        click_count: parseInt(createdLink.click_count || 0)
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating link:', error);
    return c.json(
      { error: 'Failed to create link' },
      { status: 500 }
    );
  }
});

export default app;