import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHono } from 'hono/testing'
import { meHandler } from '../functions/api/me/index'
import { Context } from 'hono'

// Mock database
const mockDB = {
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      all: vi.fn(),
      run: vi.fn()
    }))
  }))
}

const createMockContext = (headers = {}, env = { DB: mockDB }) => {
  return {
    req: {
      header: (key: string) => headers[key] || null,
      method: 'GET',
      url: '/api/me'
    },
    env
  } as unknown as Context
}

describe('GET /api/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if no JWT is provided', async () => {
    const context = createMockContext()
    const response = await meHandler(context as any)
    expect(response.status).toBe(401)
  })

  it('should return 401 if JWT is invalid', async () => {
    const context = createMockContext({
      'Cf-Access-Jwt-Assertion': 'invalid.jwt.token'
    })
    const response = await meHandler(context as any)
    expect(response.status).toBe(401)
  })

  it('should create new user if not exists', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockAll = vi.fn().mockReturnValue({ results: [] })
    const mockRun = vi.fn()

    mockDB.prepare.mockReturnValue({
      bind: mockBind,
      all: mockAll,
      run: mockRun
    })

    const jwtPayload = {
      sub: 'test@example.com',
      email: 'test@example.com',
      name: 'Test User'
    }

    const jwtToken = `header.${btoa(JSON.stringify(jwtPayload))}.signature`

    const context = createMockContext({
      'Cf-Access-Jwt-Assertion': jwtToken
    })

    const response = await meHandler(context as any)
    expect(response.status).toBe(200)

    const responseBody = await response.text()
    const user = JSON.parse(responseBody)

    expect(user.email).toBe('test@example.com')
    expect(user.role).toBe('editor')
    expect(user.name).toBe('Test User')

    expect(mockBind).toHaveBeenCalledWith('test@example.com')
    expect(mockRun).toHaveBeenCalled()
  })

  it('should return existing user if exists', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockAll = vi.fn().mockReturnValue({
      results: [{
        email: 'existing@example.com',
        role: 'admin',
        name: 'Existing User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }]
    })

    mockDB.prepare.mockReturnValue({
      bind: mockBind,
      all: mockAll,
      run: vi.fn()
    })

    const jwtToken = `header.${btoa(JSON.stringify({
      sub: 'existing@example.com',
      email: 'existing@example.com'
    }))}.signature`

    const context = createMockContext({
      'Cf-Access-Jwt-Assertion': jwtToken
    })

    const response = await meHandler(context as any)
    expect(response.status).toBe(200)

    const responseBody = await response.text()
    const user = JSON.parse(responseBody)

    expect(user.email).toBe('existing@example.com')
    expect(user.role).toBe('admin')
    expect(user.name).toBe('Existing User')

    expect(mockBind).toHaveBeenCalledWith('existing@example.com')
    expect(mockAll).toHaveBeenCalled()
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('should handle database not configured', async () => {
    const context = createMockContext(
      { 'Cf-Access-Jwt-Assertion': 'valid.jwt.token' },
      { DB: null }
    )

    const response = await meHandler(context as any)
    expect(response.status).toBe(500)
  })

  it('should extract email from JWT payload', async () => {
    const mockBind = vi.fn().mockReturnThis()
    const mockAll = vi.fn().mockReturnValue({ results: [] })
    const mockRun = vi.fn()

    mockDB.prepare.mockReturnValue({
      bind: mockBind,
      all: mockAll,
      run: mockRun
    })

    const jwtPayload = {
      sub: 'user@domain.com',
      name: 'User Name'
      // email not present, should use sub
    }

    const jwtToken = `header.${btoa(JSON.stringify(jwtPayload))}.signature`

    const context = createMockContext({
      'Cf-Access-Jwt-Assertion': jwtToken
    })

    const response = await meHandler(context as any)
    expect(response.status).toBe(200)

    const responseBody = await response.text()
    const user = JSON.parse(responseBody)

    expect(user.email).toBe('user@domain.com')
    expect(mockBind).toHaveBeenCalledWith('user@domain.com')
  })
})