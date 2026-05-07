# rov.rs Phase 3: Queue Consumer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the queue consumer worker that processes batches of click events from Cloudflare Queues and writes them to D1.

**Architecture:** Standalone Cloudflare Worker that receives ClickEventMessage batches from Queue and performs batch inserts into the click_events table.

**Tech Stack:** TypeScript, Cloudflare Workers, Wrangler, Vitest, nanoid, D1 database

---

## Task 8: Queue Consumer Worker

**Files:**
- Create: `packages/queue-consumer/src/index.ts` — queue handler
- Create: `packages/queue-consumer/src/__tests__/consumer.test.ts` — tests

The queue consumer implements the Workers Queue handler interface:
```typescript
export default {
  async queue(batch: MessageBatch<ClickEventMessage>, env: QueueConsumerEnv): Promise<void> {
    // batch insert
  }
}
```

### Implementation Plan

#### Prerequisites
- [ ] Phase 1 completed (shared package with types)
- [ ] D1 database schema created (click_events table)

#### Setup
- [ ] **Step 1: Create queue-consumer package**
  
  Create `/home/ubuntu/rovrs/packages/queue-consumer/package.json`:
  
  ```json
  {
    "name": "@rovrs/queue-consumer",
    "version": "0.1.0",
    "private": true,
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": {
      "build": "tsc",
      "dev": "wrangler dev",
      "deploy": "wrangler deploy",
      "test": "vitest",
      "typecheck": "tsc --noEmit"
    },
    "devDependencies": {
      "typescript": "^5.7.0",
      "wrangler": "^4.0.0",
      "vitest": "^3.0.0",
      "@cloudflare/vitest-pool-workers": "^0.6.0"
    },
    "dependencies": {
      "@rovrs/shared": "*"
    }
  }
  ```

- [ ] **Step 2: Create tsconfig.json**
  
  Create `/home/ubuntu/rovrs/packages/queue-consumer/tsconfig.json`:
  
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "dist",
      "rootDir": "src",
      "types": ["vitest/globals"]
    }
  }
  ```

- [ ] **Step 3: Create wrangler.toml**
  
  Create `/home/ubuntu/rovrs/packages/queue-consumer/wrangler.toml`:
  
  ```toml
  name = "rovrs-queue-consumer"
  main = "dist/index.js"
  compatibility_date = "2026-05-07"

  [env.production]
    [env.production.d1]
      binding = "DB"

    [env.production.queues]
      producers = [
        { queue = "click-events", binding = "CLICK_EVENTS_QUEUE" }
      ]

  [env.staging]
    [env.staging.d1]
      binding = "DB"

    [env.staging.queues]
      producers = [
        { queue = "click-events", binding = "CLICK_EVENTS_QUEUE" }
      ]
  ```

#### Implementation
- [ ] **Step 4: Create queue consumer handler**
  
  Create `/home/ubuntu/rovrs/packages/queue-consumer/src/index.ts`:
  
  ```typescript
  import { nanoid } from 'nanoid';
  import type { ClickEventMessage, QueueConsumerEnv } from '@rovrs/shared';

  export default {
    async queue(batch: MessageBatch<ClickEventMessage>, env: QueueConsumerEnv): Promise<void> {
      try {
        // Process up to 100 messages per batch
        const messagesToProcess = Array.from(batch.messages).slice(0, 100);
        
        if (messagesToProcess.length === 0) {
          return;
        }

        // Prepare batch insert data
        const clickEvents = messagesToProcess.map((message) => ({
          id: nanoid(),
          link_id: message.linkId,
          slug: message.slug,
          clicked_at: new Date().toISOString(),
          country: message.country,
          referrer: message.referrer,
          device_type: message.deviceType,
          is_bot: message.isBot || false,
          utm_source: message.utmSource,
          utm_medium: message.utmMedium,
          utm_campaign: message.utmCampaign,
          event_type: message.eventType || 'click'
        }));

        // Batch insert into D1 using INSERT OR IGNORE to handle duplicates
        const insertQuery = `
          INSERT OR IGNORE INTO click_events (
            id, link_id, slug, clicked_at, country, referrer, 
            device_type, is_bot, utm_source, utm_medium, 
            utm_campaign, event_type
          ) VALUES ${clickEvents.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',')}
        `;

        const params = clickEvents.flatMap(event => [
          event.id,
          event.link_id,
          event.slug,
          event.clicked_at,
          event.country,
          event.referrer,
          event.device_type,
          event.is_bot,
          event.utm_source,
          event.utm_medium,
          event.utm_campaign,
          event.event_type
        ]);

        // Execute batch insert
        const result = await env.DB.prepare(insertQuery).bind(...params).run();

        // Log results for monitoring
        if (result.success) {
          const successCount = clickEvents.length - result.meta.changes;
          const duplicateCount = result.meta.changes || 0;
          
          console.log(`Processed batch: ${clickEvents.length} events, ${successCount} inserted, ${duplicateCount} duplicates ignored`);
          
          // Acknowledge all messages
          batch.ackAll();
        } else {
          console.error('Batch insert failed:', result.error);
          // Don't acknowledge messages on failure - they'll be retried
        }
      } catch (error) {
        console.error('Queue consumer error:', error);
        // Don't acknowledge messages on error - they'll be retried
      }
    }
  };
  ```

#### Testing
- [ ] **Step 5: Create consumer tests**
  
  Create `/home/ubuntu/rovrs/packages/queue-consumer/src/__tests__/consumer.test.ts`:
  
  ```typescript
  import { describe, it, expect, beforeEach, afterEach } from 'vitest';
  import { nanoid } from 'nanoid';
  
  // Mock D1 batch method
  const mockD1Batch = {
    done: false,
    results: []
  };

  describe('Queue Consumer', () => {
    let env: QueueConsumerEnv;
    let mockDB: any;

    beforeEach(() => {
      // Reset mock state
      mockD1Batch.done = false;
      mockD1Batch.results = [];
      
      // Mock D1 database
      mockDB = {
        prepare: (query: string) => ({
          bind: (...params: any[]) => ({
            run: async () => {
              if (query.includes('INSERT OR IGNORE')) {
                return {
                  success: true,
                  meta: {
                    changes: Math.floor(Math.random() * 3) // Simulate some duplicates
                  }
                };
              }
              throw new Error('Query failed');
            }
          })
        })
      };

      env = {
        DB: mockDB
      } as QueueConsumerEnv;
    });

    it('should process batch of click events and insert into D1', async () => {
      // Create test batch
      const testMessages = Array.from({ length: 5 }, (_, i) => ({
        id: nanoid(),
        linkId: nanoid(),
        slug: `test-slug-${i}`,
        country: 'IE',
        referrer: 'https://example.com',
        deviceType: 'desktop',
        isBot: false,
        utmSource: 'test',
        utmMedium: 'social',
        utmCampaign: 'test-campaign'
      }));

      // Mock MessageBatch
      const batch = {
        messages: testMessages,
        ackAll: vitest.fn()
      };

      // Import and test the handler
      const { default: handler } = await import('../index');
      await handler.queue(batch as any, env);

      // Verify D1 insert was called with correct parameters
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO click_events')
      );
      
      // Verify all messages were acknowledged
      expect(batch.ackAll).toHaveBeenCalled();
    });

    it('should handle duplicates gracefully with INSERT OR IGNORE', async () => {
      // Create test batch
      const testMessages = Array.from({ length: 3 }, (_, i) => ({
        id: nanoid(),
        linkId: nanoid(),
        slug: `test-slug-${i}`,
        country: 'IE',
        referrer: 'https://example.com',
        deviceType: 'desktop',
        isBot: false,
        utmSource: 'test',
        utmMedium: 'social',
        utmCampaign: 'test-campaign'
      }));

      // Mock MessageBatch
      const batch = {
        messages: testMessages,
        ackAll: vitest.fn()
      };

      // Simulate some duplicates
      mockDB.prepare = (query: string) => ({
        bind: (...params: any[]) => ({
          run: async () => ({
            success: true,
            meta: {
              changes: 2 // Simulate 2 duplicates
            }
          })
        })
      });

      // Import and test the handler
      const { default: handler } = await import('../index');
      await handler.queue(batch as any, env);

      // Verify D1 was called with duplicate handling
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE')
      );
      
      // Verify messages were still acknowledged
      expect(batch.ackAll).toHaveBeenCalled();
    });

    it('should limit batch size to 100 messages', async () => {
      // Create test batch with more than 100 messages
      const testMessages = Array.from({ length: 150 }, (_, i) => ({
        id: nanoid(),
        linkId: nanoid(),
        slug: `test-slug-${i}`,
        country: 'IE',
        referrer: 'https://example.com',
        deviceType: 'desktop',
        isBot: false,
        utmSource: 'test',
        utmMedium: 'social',
        utmCampaign: 'test-campaign'
      }));

      // Mock MessageBatch
      const batch = {
        messages: testMessages,
        ackAll: vitest.fn()
      };

      // Mock D1 to verify only 100 messages are processed
      let actualParams: any[] = [];
      mockDB.prepare = (query: string) => ({
        bind: (...params: any[]) => {
          actualParams = params;
          return {
            run: async () => ({
              success: true,
              meta: { changes: 0 }
            })
          };
        }
      });

      // Import and test the handler
      const { default: handler } = await import('../index');
      await handler.queue(batch as any, env);

      // Verify only 100 messages were processed (12 params per event)
      expect(actualParams.length).toBe(100 * 12);
      
      // Verify all messages were acknowledged
      expect(batch.ackAll).toHaveBeenCalled();
    });

    it('should handle errors gracefully without acknowledging messages', async () => {
      // Create test batch
      const testMessages = Array.from({ length: 3 }, (_, i) => ({
        id: nanoid(),
        linkId: nanoid(),
        slug: `test-slug-${i}`,
        country: 'IE',
        referrer: 'https://example.com',
        deviceType: 'desktop',
        isBot: false,
        utmSource: 'test',
        utmMedium: 'social',
        utmCampaign: 'test-campaign'
      }));

      // Mock MessageBatch
      const batch = {
        messages: testMessages,
        ackAll: vitest.fn()
      };

      // Mock D1 to throw error
      mockDB.prepare = (query: string) => ({
        bind: (...params: any[]) => ({
          run: async () => {
            throw new Error('Database connection failed');
          }
        })
      });

      // Import and test the handler
      const { default: handler } = await import('../index');
      await handler.queue(batch as any, env);

      // Verify messages were NOT acknowledged (for retry)
      expect(batch.ackAll).not.toHaveBeenCalled();
    });

    it('should generate unique IDs for each click event', async () => {
      // Create test batch
      const testMessages = Array.from({ length: 5 }, (_, i) => ({
        id: nanoid(),
        linkId: nanoid(),
        slug: `test-slug-${i}`,
        country: 'IE',
        referrer: 'https://example.com',
        deviceType: 'desktop',
        isBot: false,
        utmSource: 'test',
        utmMedium: 'social',
        utmCampaign: 'test-campaign'
      }));

      // Mock MessageBatch
      const batch = {
        messages: testMessages,
        ackAll: vitest.fn()
      };

      let actualParams: any[] = [];
      mockDB.prepare = (query: string) => ({
        bind: (...params: any[]) => {
          actualParams = params;
          return {
            run: async () => ({
              success: true,
              meta: { changes: 0 }
            })
          };
        }
      });

      // Import and test the handler
      const { default: handler } = await import('../index');
      await handler.queue(batch as any, env);

      // Verify first parameter of each event is a unique ID
      const eventIds = actualParams.filter((_, i) => i % 12 === 0);
      expect(new Set(eventIds).size).toBe(5); // All IDs should be unique
    });
  });
  ```

#### TDD Approach
- [ ] **Step 6: Run tests to verify implementation**
  
  Run the tests to ensure the implementation is correct:
  
  ```bash
  cd packages/queue-consumer
  npm test
  ```

#### Complete Code
- [ ] **Step 7: Verify final implementation**
  
  The implementation should include:
  - Batch processing of up to 100 messages
  - INSERT OR IGNORE for duplicate handling
  - Proper error handling without message acknowledgment
  - Comprehensive logging for monitoring
  - Unique ID generation for each click event
  - Support for all ClickEventMessage fields

#### Deployment
- [ ] **Step 8: Deploy to Cloudflare**
  
  Deploy the queue consumer to Cloudflare:
  
  ```bash
  cd packages/queue-consumer
  npm run deploy
  ```

#### Commit
- [ ] **Step 9: Commit changes**
  
  Commit the queue consumer implementation:
  
  ```bash
  git add packages/queue-consumer/
  git commit -m "feat: implement queue consumer worker for click event batch processing

  - Implements Cloudflare Queue handler interface
  - Processes batches of up to 100 ClickEventMessage
  - Uses INSERT OR IGNORE for duplicate handling
  - Includes comprehensive error handling and logging
  - Adds full test coverage with mocked D1
  
  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
  ```

---

**Success Criteria:**
- Queue consumer successfully processes click event batches
- Properly handles duplicates without errors
- Logs processing results for monitoring
- All tests pass with mocked D1 database
- Ready for integration with redirect worker