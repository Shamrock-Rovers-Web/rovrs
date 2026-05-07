import { drizzle } from 'drizzle-orm/cloudflare-d1';
import { links, clickEvents, rateLimits, variantGenerations } from './schema';

// Database exports
export const db = drizzle(env => env.DB);

// Table exports
export { links, clickEvents, rateLimits, variantGenerations };

// Helper functions for testing
export const mockDB = {
  prepare: (query: string) => ({
    bind: (...values: any[]) => ({
      all: async () => {
        // Mock database responses
        if (query.includes('SELECT COUNT(*)')) {
          return [{ count: '2' }];
        }
        if (query.includes('SELECT') && query.includes('links')) {
          return [
            {
              rowid: 1,
              slug: 'test-link',
              destination_url: 'https://example.com',
              title: 'Test Link',
              status: 'active',
              redirect_code: 302,
              created_at: '2024-01-01T00:00:00Z',
              click_count: '0'
            }
          ];
        }
        return [];
      },
      first: async () => {
        if (query.includes('SELECT') && query.includes('links')) {
          return {
            rowid: 1,
            slug: 'test-link',
            destination_url: 'https://example.com',
            title: 'Test Link',
            status: 'active',
            redirect_code: 302,
            created_at: '2024-01-01T00:00:00Z'
          };
        }
        return null;
      },
      run: async () => ({ meta: { last_row_id: 1, changes: 1 } })
    }),
    run: async () => ({ meta: { last_row_id: 1, changes: 1 } })
  })
};