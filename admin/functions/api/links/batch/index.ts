import { Context, Hono } from 'hono';
import { eq, isNull } from 'drizzle-orm/expressions';
import { links } from '../../schema';
import { BatchOperation } from '@rovrs/shared';
import { applyRateLimit } from '../../rate-limit';

const app = new Hono();
applyRateLimit(app);

// POST /api/links/batch - Batch operations on multiple links
app.post('/', async (c) => {
  try {
    const operations = await c.req.json<BatchOperation[]>();

    if (!Array.isArray(operations) || operations.length === 0) {
      return c.json(
        {
          success: false,
          error: 'Operations must be a non-empty array'
        },
        { status: 400 }
      );
    }

    if (operations.length > 100) {
      return c.json(
        {
          success: false,
          error: 'Maximum 100 operations per batch'
        },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const operation of operations) {
      try {
        const { operation: op, slug, destination_url } = operation;

        // Validate operation
        const validOps = ['pause', 'expire', 'update_destination'];
        if (!validOps.includes(op)) {
          errors.push({
            slug,
            error: `Invalid operation: ${op}`
          });
          continue;
        }

        // Check if link exists
        const existingLink = await c.env.DB.prepare(`
          SELECT rowid, status FROM links WHERE slug = ? AND status != 'deleted'
        `).bind(slug).first();

        if (!existingLink) {
          errors.push({
            slug,
            error: 'Link not found'
          });
          continue;
        }

        // Update based on operation
        const now = new Date().toISOString();
        let updateData: Record<string, any> = { updated_at: now, updated_by: c.get('user')?.email || 'unknown' };

        switch (op) {
          case 'pause':
            updateData.status = 'paused';
            break;
          case 'expire':
            updateData.status = 'expired';
            updateData.expires_at = new Date().toISOString();
            break;
          case 'update_destination':
            if (!destination_url) {
              errors.push({
                slug,
                error: 'Destination URL is required for update_destination operation'
              });
              continue;
            }

            // Validate destination URL
            try {
              const url = new URL(destination_url);
              const unsafeProtocols = ['javascript:', 'data:', 'file:', 'ftp:'];
              if (unsafeProtocols.includes(url.protocol)) {
                errors.push({
                  slug,
                  error: 'URL protocol is not allowed'
                });
                continue;
              }

              updateData.destination_url = destination_url;
              updateData.destination_domain = url.hostname;
              updateData.updated_at = now;
              updateData.updated_by = c.get('user')?.email || 'unknown';
            } catch {
              errors.push({
                slug,
                error: 'Invalid destination URL format'
              });
              continue;
            }
            break;
        }

        // Execute update
        const updateFields = Object.keys(updateData);
        const updateValues = updateFields.map(field => updateData[field]);

        await c.env.DB.prepare(`
          UPDATE links
          SET ${updateFields.map((_, index) => `${updateFields[index]} = ?`).join(', ')}
          WHERE rowid = ?
        `).bind(...updateValues, existingLink.rowid).run();

        results.push({
          slug,
          operation: op,
          status: 'success'
        });
      } catch (error) {
        console.error(`Error processing operation for ${slug}:`, error);
        errors.push({
          slug,
          error: 'Internal server error'
        });
      }
    }

    return c.json({
      success: true,
      results,
      errors,
      total_processed: operations.length,
      successful: results.length,
      failed: errors.length
    });
  } catch (error) {
    console.error('Error processing batch operations:', error);
    return c.json(
      { error: 'Failed to process batch operations' },
      { status: 500 }
    );
  }
});

export default app;