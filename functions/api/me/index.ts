import { Context } from 'hono'

interface User {
  email: string
  role: 'admin' | 'editor'
  name: string | null
  created_at: string
  updated_at: string
}

export async function onRequest(context: Context): Promise<Response> {
  try {
    const cfAccessJWT = context.req.header('Cf-Access-Jwt-Assertion')

    if (!cfAccessJWT) {
      return new Response('Unauthorized', { status: 401 })
    }

    const jwtParts = cfAccessJWT.split('.')
    if (jwtParts.length !== 3) {
      return new Response('Invalid JWT', { status: 401 })
    }

    const payload = JSON.parse(atob(jwtParts[1]))
    const email = payload.email || payload.sub

    if (!email) {
      return new Response('Email not found in token', { status: 401 })
    }

    // For development, create a default user if none exists
    // In production, this would be handled by a proper auth system
    const db = context.env.DB
    if (!db) {
      return new Response('Database not configured', { status: 500 })
    }

    // Check if user exists
    const { results } = await db.prepare(`
      SELECT email, role, name, created_at, updated_at
      FROM users
      WHERE email = ?
    `).bind(email).all()

    let user: User
    if (results.length === 0) {
      // Create new user with default role
      await db.prepare(`
        INSERT INTO users (email, role, name, created_at, updated_at)
        VALUES (?, 'editor', ?, datetime('now'), datetime('now'))
      `).bind(email, payload.name || null).run()

      user = {
        email,
        role: 'editor',
        name: payload.name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    } else {
      user = results[0] as User
    }

    return new Response(JSON.stringify({
      email: user.email,
      role: user.role,
      name: user.name,
      created_at: user.created_at,
      updated_at: user.updated_at
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in /api/me:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}