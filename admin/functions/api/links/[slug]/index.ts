import { Context, Hono } from 'hono';
import { eq, isNull } from 'drizzle-orm/expressions';
import { links, clickEvents } from '../../schema';
import { validateUpdateInput, LinkUpdateInput } from '@rovrs/shared';
import { applyRateLimit } from '../../rate-limit';

const app = new Hono();
applyRateLimit(app);

// GET /api/links/{slug} - Get single link
app.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');

    const link = await c.env.DB.prepare(`
      SELECT
        l.*,
        (SELECT COUNT(*) FROM click_events WHERE slug = l.slug) as click_count
      FROM links l
      WHERE l.slug = ? AND (l.status != 'deleted' OR l.deleted_at IS NOT NULL)
    `).bind(slug).first();

    if (!link) {
      return c.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    return c.json({
      success: true,
      data: {
        ...link,
        expires_at: link.expires_at || null,
        click_count: parseInt(link.click_count || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching link:', error);
    return c.json(
      { error: 'Failed to fetch link' },
      { status: 500 }
    );
  }
});

// PATCH /api/links/{slug} - Update link
app.patch('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const input = await c.req.json<LinkUpdateInput>();

    // Validate input
    const errors = validateUpdateInput(input);
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

    // Check if link exists and is not deleted
    const existingLink = await c.env.DB.prepare(`
      SELECT rowid FROM links WHERE slug = ? AND status != 'deleted'
    `).bind(slug).first();

    if (!existingLink) {
      return c.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Parse domain if destination URL is being updated
    let destinationDomain = input.destination_url ? null : undefined;
    if (input.destination_url) {
      try {
        const url = new URL(input.destination_url);
        destinationDomain = url.hostname;
      } catch {
        const match = input.destination_url.match(/https?:\/\/([^\/]+)/);
        if (match) {
          destinationDomain = match[1];
        }
      }
    }

    // Update link
    const now = new Date().toISOString();
    const updateFields = [
      'destination_url',
      'title',
      'campaign',
      'channel',
      'status',
      'redirect_code',
      'is_qr',
      'is_offsite_ticket',
      'show_offsite_preview',
      'expires_at',
      'notes',
      'destination_domain',
      'updated_at',
      'updated_by'
    ].filter(field => input[field as keyof LinkUpdateInput] !== undefined);

    const updateValues = updateFields.map(field => {
      if (field === 'destination_domain' && input.destination_url) {
        return destinationDomain;
      }
      return input[field as keyof LinkUpdateInput];
    });

    updateValues.push(now, c.get('user')?.email || 'unknown');

    const result = await c.env.DB.prepare(`
      UPDATE links
      SET ${updateFields.map((_, index) => `${updateFields[index]} = ?`).join(', ')}
      WHERE rowid = ?
    `).bind(...updateValues, existingLink.rowid).run();

    // Get updated link
    const updatedLink = await c.env.DB.prepare(`
      SELECT
        l.*,
        (SELECT COUNT(*) FROM click_events WHERE slug = l.slug) as click_count
      FROM links l
      WHERE l.rowid = ?
    `).bind(existingLink.rowid).first();

    return c.json({
      success: true,
      data: {
        ...updatedLink,
        expires_at: updatedLink.expires_at || null,
        click_count: parseInt(updatedLink.click_count || 0)
      }
    });
  } catch (error) {
    console.error('Error updating link:', error);
    return c.json(
      { error: 'Failed to update link' },
      { status: 500 }
    );
  }
});

// DELETE /api/links/{slug} - Soft delete link
app.delete('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');

    // Check if link exists
    const existingLink = await c.env.DB.prepare(`
      SELECT rowid FROM links WHERE slug = ? AND status != 'deleted'
    `).bind(slug).first();

    if (!existingLink) {
      return c.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Soft delete by adding suffix and marking as deleted
    const deletedSlug = `${slug}-deleted-${Date.now()}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE links
      SET slug = ?, status = 'deleted', deleted_at = ?, updated_at = ?, updated_by = ?
      WHERE rowid = ?
    `).bind(deletedSlug, now, now, c.get('user')?.email || 'unknown', existingLink.rowid).run();

    return c.json({
      success: true,
      message: 'Link deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting link:', error);
    return c.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    );
  }
});

// POST /api/links/{slug}/restore - Restore deleted link
app.post('/:slug/restore', async (c) => {
  try {
    const slug = c.req.param('slug');
    const originalSlug = slug.replace(/-deleted-\d+$/, '');

    // Check if deleted link exists
    const deletedLink = await c.env.DB.prepare(`
      SELECT rowid FROM links WHERE slug = ? AND status = 'deleted'
    `).bind(slug).first();

    if (!deletedLink) {
      return c.json(
        { error: 'Deleted link not found' },
        { status: 404 }
      );
    }

    // Check if original slug is available
    const existingLink = await c.env.DB.prepare(`
      SELECT slug FROM links WHERE slug = ? AND status != 'deleted'
    `).bind(originalSlug).first();

    if (existingLink) {
      return c.json(
        {
          success: false,
          error: 'Original slug is already in use'
        },
        { status: 409 }
      );
    }

    // Restore link
    const now = new Date().toISOString();
    await c.env.DB.prepare(`
      UPDATE links
      SET slug = ?, status = 'active', deleted_at = NULL, updated_at = ?, updated_by = ?
      WHERE rowid = ?
    `).bind(originalSlug, now, c.get('user')?.email || 'unknown', deletedLink.rowid).run();

    return c.json({
      success: true,
      message: 'Link restored successfully',
      restored_to: originalSlug
    });
  } catch (error) {
    console.error('Error restoring link:', error);
    return c.json(
      { error: 'Failed to restore link' },
      { status: 500 }
    );
  }
});

export default app;