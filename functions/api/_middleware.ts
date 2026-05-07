import { Context } from 'hono'

export async function onRequest(context: Context): Promise<Response> {
  const request = context.req
  const cfAccessJWT = request.header('Cf-Access-Jwt-Assertion')

  if (!cfAccessJWT) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Cf-Access-Jwt-Assertion' }
    })
  }

  return await context.next()
}