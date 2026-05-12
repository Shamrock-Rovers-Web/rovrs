interface Env {
  DB: D1Database;
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const users = await context.env.DB.prepare(
      'SELECT * FROM users ORDER BY created_at DESC'
    ).all();

    return json({ success: true, data: users.results });
  } catch (error) {
    console.error('Error fetching users:', error);
    return json({ success: false, error: 'Failed to fetch users' }, 500);
  }
};
