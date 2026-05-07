import { Context, Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { settings } from '../../schema';
import { applyRateLimit } from '../../rate-limit';

const app = new Hono();
applyRateLimit(app);

// GET /api/settings/[key] - Get setting value
app.get('/', async (c) => {
  try {
    const key = c.req.param('key');

    const setting = await c.env.DB.prepare(`
      SELECT * FROM settings WHERE key = ?
    `).bind(key).first();

    if (!setting) {
      return c.json(
        {
          success: false,
          error: 'Setting not found'
        },
        { status: 404 }
      );
    }

    return c.json({
      success: true,
      key: setting.key,
      value: setting.value,
      updated_by: setting.updated_by,
      updated_at: setting.updated_at
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return c.json(
      { error: 'Failed to fetch setting' },
      { status: 500 }
    );
  }
});

// PUT /api/settings/[key] - Update setting value
app.put('/', async (c) => {
  try {
    const key = c.req.param('key');
    const { value } = await c.req.json();

    // Check if setting exists
    const existingSetting = await c.env.DB.prepare(`
      SELECT * FROM settings WHERE key = ?
    `).bind(key).first();

    if (existingSetting) {
      // Update existing setting
      const result = await c.env.DB.prepare(`
        UPDATE settings
        SET value = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
        WHERE key = ?
      `).bind(value, c.get('user')?.email || 'system', key).run();

      if (result.changes === 0) {
        return c.json(
          { error: 'Failed to update setting' },
          { status: 400 }
        );
      }
    } else {
      // Create new setting
      const result = await c.env.DB.prepare(`
        INSERT INTO settings (key, value, updated_by, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(key, value, c.get('user')?.email || 'system').run();

      if (result.changes === 0) {
        return c.json(
          { error: 'Failed to create setting' },
          { status: 400 }
        );
      }
    }

    // Get updated setting
    const updatedSetting = await c.env.DB.prepare(`
      SELECT * FROM settings WHERE key = ?
    `).bind(key).first();

    return c.json({
      success: true,
      key: updatedSetting.key,
      value: updatedSetting.value,
      updated_by: updatedSetting.updated_by,
      updated_at: updatedSetting.updated_at
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    return c.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
});

export default app;