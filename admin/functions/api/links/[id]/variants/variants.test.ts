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

const createMockContext = (method = 'PATCH', body = null, headers = {}, env = { DB: mockDB }) => {
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

describe('PATCH /api/links/{id}/variants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 if destination_url is missing', async () => {
    const context = createMockContext('PATCH', {}, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./variants')
    const response = await handler(context as any)

    expect(response.status).toBe(400)
  })

  it('should return 400 if URL is invalid', async () => {
    const context = createMockContext('PATCH', { destination_url: 'not-a-url' }, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./variants')
    const response = await handler(context as any)

    expect(response.status).toBe(400)
  })

  it('should return 404 if base link not found', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockFirst = vi.fn().mockReturnValue(null)

    mockDB.prepare.mockReturnValue({
      bind: mockBind,
      first: mockFirst
    })

    const context = createMockContext('PATCH', { destination_url: 'https://new.com' }, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./variants')
    const response = await handler(context as any)

    expect(response.status).toBe(404)
    expect(mockBind).toHaveBeenCalledWith('test')
  })

  it('should return 404 if no variants found', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockFirst = vi.fn().mockReturnValue({
      id: 1,
      slug: 'test',
      destination_url: 'https://old.com',
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
    const mockAll = vi.fn().mockReturnValue([])

    mockDB.prepare.mockImplementation((query) => {
      if (query.includes('SELECT * FROM links WHERE id = ?')) {
        return {
          bind: mockBind,
          first: mockFirst
        }
      }
      if (query.includes('SELECT * FROM links WHERE variant_of = ?')) {
        return {
          bind: mockBind,
          all: mockAll
        }
      }
      return {
        bind: mockBind,
        all: mockAll,
        run: vi.fn()
      }
    })

    const context = createMockContext('PATCH', { destination_url: 'https://new.com' }, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./variants')
    const response = await handler(context as any)

    expect(response.status).toBe(404)
    expect(mockAll).toHaveBeenCalled()
  })

  it('should update variants successfully when destination changes', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockFirst = vi.fn().mockReturnValue({
      id: 1,
      slug: 'test',
      destination_url: 'https://old.com',
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
    const mockAll = vi.fn().mockReturnValue([
      { id: 2, slug: 'test-ig', destination_url: 'https://old.com' },
      { id: 3, slug: 'test-fb', destination_url: 'https://old.com' }
    ])
    const mockUpdateRun = vi.fn()
    const mockHistoryRun = vi.fn()

    mockDB.prepare.mockImplementation((query) => {
      if (query.includes('SELECT * FROM links WHERE id = ?')) {
        return {
          bind: mockBind,
          first: mockFirst
        }
      }
      if (query.includes('SELECT * FROM links WHERE variant_of = ?')) {
        return {
          bind: mockBind,
          all: mockAll
        }
      }
      if (query.includes('UPDATE links SET')) {
        return {
          bind: mockBind,
          run: mockUpdateRun
        }
      }
      if (query.includes('INSERT INTO destination_history')) {
        return {
          bind: mockBind,
          run: mockHistoryRun
        }
      }
      return {
        bind: mockBind,
        all: mockAll,
        run: vi.fn()
      }
    })

    const context = createMockContext('PATCH', { destination_url: 'https://new.com' }, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./variants')
    const response = await handler(context as any)

    expect(response.status).toBe(200)
    expect(mockUpdateRun).toHaveBeenCalledTimes(2)
    expect(mockHistoryRun).toHaveBeenCalledTimes(2)
  })

  it('should skip variants with unchanged destination', async () => {
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
    const mockAll = vi.fn().mockReturnValue([
      { id: 2, slug: 'test-ig', destination_url: 'https://example.com' },
      { id: 3, slug: 'test-fb', destination_url: 'https://new.com' }
    ])
    const mockUpdateRun = vi.fn()
    const mockHistoryRun = vi.fn()

    mockDB.prepare.mockImplementation((query) => {
      if (query.includes('SELECT * FROM links WHERE id = ?')) {
        return {
          bind: mockBind,
          first: mockFirst
        }
      }
      if (query.includes('SELECT * FROM links WHERE variant_of = ?')) {
        return {
          bind: mockBind,
          all: mockAll
        }
      }
      if (query.includes('UPDATE links SET')) {
        return {
          bind: mockBind,
          run: mockUpdateRun
        }
      }
      if (query.includes('INSERT INTO destination_history')) {
        return {
          bind: mockBind,
          run: mockHistoryRun
        }
      }
      return {
        bind: mockBind,
        all: mockAll,
        run: vi.fn()
      }
    })

    const context = createMockContext('PATCH', { destination_url: 'https://example.com' }, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./variants')
    const response = await handler(context as any)

    expect(response.status).toBe(200)
    expect(mockUpdateRun).not.toHaveBeenCalled()
    expect(mockHistoryRun).not.toHaveBeenCalled()
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

    mockDB.prepare.mockImplementation((query) => {
      if (query.includes('SELECT * FROM links WHERE id = ?')) {
        return {
          bind: mockBind,
          first: mockFirst
        }
      }
      return {
        bind: mockBind,
        all: vi.fn().mockReturnValue([{ id: 2, slug: 'test-ig', destination_url: 'https://example.com' }]),
        run: vi.fn().mockImplementation(() => {
          throw new Error('Database error')
        })
      }
    })

    const context = createMockContext('PATCH', { destination_url: 'https://new.com' }, {
      'Cf-Access-Jwt-Assertion': 'valid.jwt.token'
    })

    // Import the handler after mocking
    const { default: handler } = await import('./variants')
    const response = await handler(context as any)

    expect(response.status).toBe(500)
  })
})