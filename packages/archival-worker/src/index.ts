interface Env {
  DB: D1Database;
  ARCHIVE: R2Bucket;
  RETENTION_DAYS: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const retentionDays = parseInt(env.RETENTION_DAYS || '180', 10);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Archiving click events older than ${cutoff}`);

    let archived = 0;
    let hasMore = true;

    while (hasMore) {
      const { results } = await env.DB
        .prepare('SELECT * FROM click_events WHERE clicked_at < ? LIMIT 1000')
        .bind(cutoff)
        .all();

      if (!results || results.length === 0) {
        hasMore = false;
        break;
      }

      // Group by date for R2 partitioning
      const byDate = new Map<string, any[]>();
      for (const row of results) {
        const date = (row.clicked_at as string).substring(0, 10);
        if (!byDate.has(date)) byDate.set(date, []);
        byDate.get(date)!.push(row);
      }

      // Write to R2
      for (const [date, rows] of byDate) {
        const [year, month] = date.split('-');
        const key = `archive/${year}/${month}/${date}.json`;

        // Append to existing archive or create new
        const existing = await env.ARCHIVE.get(key);
        let existingData: any[] = [];
        if (existing) {
          existingData = (await existing.json()) as any[];
        }

        existingData.push(...rows);
        await env.ARCHIVE.put(key, JSON.stringify(existingData));
      }

      // Delete archived rows from D1
      const ids = results.map((r: any) => r.id);
      const placeholders = ids.map(() => '?').join(',');
      await env.DB
        .prepare(`DELETE FROM click_events WHERE id IN (${placeholders})`)
        .bind(...ids)
        .run();

      archived += results.length;
      console.log(`Archived ${archived} events so far`);

      // Stop if we got less than batch size
      if (results.length < 1000) hasMore = false;
    }

    console.log(`Archival complete. ${archived} events archived.`);
  },
};
