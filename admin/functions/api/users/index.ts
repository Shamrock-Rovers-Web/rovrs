import { Context, Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { eq, or, desc, ilike, and, isNull, lt } from 'drizzle-orm';
import { users, settings } from '../schema';
import { applyRateLimit } from '../rate-limit';

const app = new Hono();
applyRateLimit(app);

// GET /api/users - List users with pagination
app.get('/', async (c) => {
  try {
    const {
      search = '',
      role = '',
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

    if (role) {
      conditions.push(eq(users.role, role));
    }

    if (search) {
      conditions.push(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.name, `%${search}%`)
        )
      );
    }

    // Build sort conditions
    const sortByMap = {
      'created_at': users.created_at,
      'updated_at': users.updated_at,
      'name': users.name,
      'email': users.email,
      'last_login': sql`NULLIF(${users.last_login_at}, '') IS NOT NULL DESC, NULLIF(${users.last_login_at}, '') DESC`
    };

    const sortBy = sortByMap[sort_by as keyof typeof sortByMap] || users.created_at;
    const sortOrder = sort_order === 'asc' ? 'asc' : 'desc';

    // Get total count
    const [{ count: totalCount }] = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE ${conditions.length > 0 ? conditions.join(' AND ') : '1=1'}
    `).all();

    // Get users
    const usersData = await c.env.DB.prepare(`
      SELECT *
      FROM users
      WHERE ${conditions.length > 0 ? conditions.join(' AND ') : '1=1'}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `).bind(validatedLimit, validatedOffset).all();

    // Format response
    const formattedUsers = usersData.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      last_login_at: user.last_login_at || null,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    return c.json({
      success: true,
      data: formattedUsers,
      pagination: {
        total: parseInt(totalCount),
        limit: validatedLimit,
        offset: validatedOffset,
        has_more: validatedOffset + validatedLimit < parseInt(totalCount)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
});

// PATCH /api/users/[id] - Update user role (admin only)
app.patch('/:id', async (c) => {
  try {
    // Check if user is admin
    const currentUser = c.get('user');
    if (!currentUser || currentUser.role !== 'admin') {
      return c.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = c.req.param('id');
    const { role } = await c.req.json();

    // Validate role
    if (!['admin', 'user'].includes(role)) {
      return c.json(
        { error: 'Invalid role. Must be admin or user' },
        { status: 400 }
      );
    }

    // Prevent self-demotion
    if (currentUser.id === parseInt(userId) && currentUser.role === 'admin' && role === 'user') {
      return c.json(
        { error: 'Cannot demote yourself' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await c.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first();

    if (!existingUser) {
      return c.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user
    const result = await c.env.DB.prepare(`
      UPDATE users
      SET role = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
      WHERE id = ?
    `).bind(role, currentUser.email, userId).run();

    if (result.changes === 0) {
      return c.json(
        { error: 'Failed to update user' },
        { status: 400 }
      );
    }

    // Get updated user
    const updatedUser = await c.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first();

    return c.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        is_active: updatedUser.is_active,
        last_login_at: updatedUser.last_login_at || null,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
});

export default app;