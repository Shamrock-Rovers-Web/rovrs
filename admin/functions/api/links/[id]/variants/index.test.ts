import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHono } from 'hono/testing'
import { Context } from 'hono'

// Mock database
const mockDB = {
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      all: vi.fn(),
      first: vi.fn(),
      run: vi.fn()
    }))
  }))
}

const createMockContext = (method = 'POST', body = null, headers = {}, env = { DB: mockDB }) => {
  return {
    req: {
      header: (key: string) => headers[key] || null,
      method,
      url: '/api/links/1/variants',
      json: async () => body || {}
    },
    env,
    get: vi.fn(() => ({ email: 'test@example.com' }))
  } as unknown as Context
}

describe('POST /api/links/{id}/variants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 404 if base link not found', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockFirst = vi.fn().mockReturnValue(null)

    mockDB.prepare.mockReturnValue({
      bind: mockBind,
      first: mockFirst
    })

    const context = createMockContext('POST', {}, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./index')
    const response = await handler(context as any)

    expect(response.status).toBe(404)
    expect(mockBind).toHaveBeenCalledWith('test')
    expect(mockFirst).toHaveBeenCalled()
  })

  it('should return 409 if variants already exist', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockFirst = vi.fn().mockReturnValue({
      id: 1,
      slug: 'test',
      destination_url: 'https://example.com',
      title: 'Test Link',
      campaign: 'test-campaign',
      channel: 'web',
      status: 'active',
      redirect_code: 302,
      is_qr_generated: false,
      show_interstitial: false,
      expires_at: null,
      created_by: 'test@example.com'
    })
    const mockCount = vi.fn().mockReturnValue({ count: 1 })

    mockDB.prepare.mockImplementation((query) => {
      if (query.includes('SELECT COUNT(*)')) {
        return {
          bind: mockBind,
          first: mockCount
        }
      }
      return {
        bind: mockBind,
        first: mockFirst
      }
    })

    const context = createMockContext('POST', {}, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./index')
    const response = await handler(context as any)

    expect(response.status).toBe(409)
  })

  it('should generate social variants successfully', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockFirst = vi.fn().mockReturnValue({
      id: 1,
      slug: 'test',
      destination_url: 'https://example.com',
      title: 'Test Link',
      campaign: 'test-campaign',
      channel: 'web',
      status: 'active',
      redirect_code: 302,
      is_qr_generated: false,
      show_interstitial: false,
      expires_at: null,
      created_by: 'test@example.com'
    })
    const mockCount = vi.fn().mockReturnValue({ count: 0 })
    const mockVariantFirst = vi.fn().mockReturnValue(null)
    const mockRun = vi.fn().mockReturnValue({ meta: { last_row_id: 2 } })

    let callCount = 0
    mockDB.prepare.mockImplementation((query) => {
      if (query.includes('SELECT COUNT(*)')) {
        return {
          bind: mockBind,
          first: mockCount
        }
      }
      if (query.includes('SELECT slug FROM links WHERE slug = ?')) {
        return {
          bind: mockBind,
          first: mockVariantFirst
        }
      }
      return {
        bind: mockBind,
        first: mockFirst,
        run: mockRun
      }
    })

    const context = createMockContext('POST', {}, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./index')
    const response = await handler(context as any)

    expect(response.status).toBe(201)
    expect(mockRun).toHaveBeenCalledTimes(5) // 4 variants + 1 generation record
  })

  it('should skip existing variant slugs', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockFirst = vi.fn().mockReturnValue({
      id: 1,
      slug: 'test',
      destination_url: 'https://example.com',
      title: 'Test Link',
      campaign: 'test-campaign',
      channel: 'web',
      status: 'active',
      redirect_code: 302,
      is_qr_generated: false,
      show_interstitial: false,
      expires_at: null,
      created_by: 'test@example.com'
    })
    const mockCount = vi.fn().mockReturnValue({ count: 0 })

    // Mock that -ig slug already exists
    let callCount = 0
    mockDB.prepare.mockImplementation((query) => {
      if (query.includes('SELECT COUNT(*)')) {
        return {
          bind: mockBind,
          first: mockCount
        }
      }
      if (query.includes('SELECT slug FROM links WHERE slug = ?')) {
        return {
          bind: mockBind,
          first: vi.fn().mockImplementation(() => {
            callCount++
            // Return null for all except -ig
            return callCount === 1 ? { slug: 'test-ig' } : null
          })
        }
      }
      return {
        bind: mockBind,
        first: mockFirst,
        run: vi.fn().mockReturnValue({ meta: { last_row_id: 2 } })
      }
    })

    const context = createMockContext('POST', {}, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./index')
    const response = await handler(context as any)

    expect(response.status).toBe(201)
  })

  it('should handle database errors', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockFirst = vi.fn().mockReturnValue({
      id: 1,
      slug: 'test',
      destination_url: 'https://example.com',
      title: 'Test Link',
      campaign: 'test-campaign',
      channel: 'web',
      status: 'active',
      redirect_code: 302,
      is_qr_generated: false,
      show_interstitial: false,
      expires_at: null,
      created_by: 'test@example.com'
    })

    mockDB.prepare.mockReturnValue({
      bind: mockBind,
      first: mockFirst,
      run: vi.fn().mockImplementation(() => {
        throw new Error('Database error')
      })
    })

    const context = createMockContext('POST', {}, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./index')
    const response = await handler(context as any)

    expect(response.status).toBe(500)
  })
})