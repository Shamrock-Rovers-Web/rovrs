interface Env {
  DB: D1Database;
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const operations = await context.request.json() as Array<{
      operation: string;
      slug: string;
      destination_url?: string;
    }>;

    if (!Array.isArray(operations) || operations.length === 0) {
      return json({ success: false, error: 'Operations must be a non-empty array' }, 400);
    }

    if (operations.length > 100) {
      return json({ success: false, error: 'Maximum 100 operations per batch' }, 400);
    }

    const validOps = ['pause', 'expire', 'update_destination'];
    const results: any[] = [];
    const errors: any[] = [];

    for (const op of operations) {
      try {
        if (!validOps.includes(op.operation)) {
          errors.push({ slug: op.slug, error: `Invalid operation: ${op.operation}` });
          continue;
        }

        const existing = await context.env.DB.prepare(
          "SELECT id FROM links WHERE slug = ? AND status != 'deleted'"
        ).bind(op.slug).first<{ id: string }>();

        if (!existing) {
          errors.push({ slug: op.slug, error: 'Link not found' });
          continue;
        }

        switch (op.operation) {
          case 'pause':
            await context.env.DB.prepare(
              "UPDATE links SET status = 'paused', updated_at = datetime('now') WHERE id = ?"
            ).bind(existing.id).run();
            break;

          case 'expire':
            await context.env.DB.prepare(
              `UPDATE links SET status = 'expired', expires_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
            ).bind(existing.id).run();
            break;

          case 'update_destination':
            if (!op.destination_url) {
              errors.push({ slug: op.slug, error: 'destination_url required' });
              continue;
            }
            try {
              const hostname = new URL(op.destination_url).hostname;
              await context.env.DB.prepare(
                `UPDATE links SET destination_url = ?, destination_domain = ?, updated_at = datetime('now') WHERE id = ?`
              ).bind(op.destination_url, hostname, existing.id).run();
            } catch {
              errors.push({ slug: op.slug, error: 'Invalid destination URL' });
              continue;
            }
            break;
        }

        results.push({ slug: op.slug, operation: op.operation, status: 'success' });
      } catch {
        errors.push({ slug: op.slug, error: 'Internal error' });
      }
    }

    return json({
      success: true,
      results,
      errors,
      total_processed: operations.length,
      successful: results.length,
      failed: errors.length,
    });
  } catch (error) {
    console.error('Error processing batch:', error);
    return json({ success: false, error: 'Failed to process batch operations' }, 500);
  }
};
