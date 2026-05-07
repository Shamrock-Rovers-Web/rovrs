import { Context, Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm/expressions';
import { applyRateLimit } from '../../rate-limit';
import csvParser from 'csv-parser';

const app = new Hono();
applyRateLimit(app);

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportRow {
  slug?: string;
  destination_url: string;
  title?: string;
  campaign?: string;
  channel?: string;
  expires_at?: string;
  match_info?: string;
  is_offsite?: string;
  show_preview?: string;
  is_stable_evergreen?: string;
}

// POST /api/import/csv - Handle CSV upload and import
app.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json(
        {
          success: false,
          error: 'No file provided'
        },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return c.json(
        {
          success: false,
          error: 'File must be a CSV'
        },
        { status: 400 }
      );
    }

    // Generate job ID
    const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create import job record
    await c.env.DB.prepare(`
      INSERT INTO import_jobs (job_id, status, total_rows, created_rows, skipped_rows, errors, created_at)
      VALUES (?, ?, 0, 0, 0, '[]', ?)
    `).bind(jobId, 'pending', new Date().toISOString()).run();

    // Process CSV file
    const rows: ImportRow[] = [];
    const errors: ImportError[] = [];
    let rowNumber = 0;

    // Parse CSV
    const csvText = await file.text();
    const csvStream = csvParser({
      headers: true,
      skipEmptyLines: true
    });

    await new Promise<void>((resolve, reject) => {
      csvStream.on('data', (data: ImportRow) => {
        rowNumber++;
        rows.push(data);
      });

      csvStream.on('end', () => {
        resolve();
      });

      csvStream.on('error', (error) => {
        reject(error);
      });

      csvStream.write(csvText);
      csvStream.end();
    });

    // Validate and process rows
    const validRows: ImportRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Check if row has required fields
      if (!row.destination_url) {
        errors.push({
          row: rowNum,
          field: 'destination_url',
          message: 'Destination URL is required'
        });
        continue;
      }

      // Validate URL format
      try {
        new URL(row.destination_url);
      } catch {
        errors.push({
          row: rowNum,
          field: 'destination_url',
          message: 'Invalid URL format'
        });
        continue;
      }

      // Check for blocked protocols
      const blockedProtocols = ['javascript:', 'data:', 'file:', 'ftp:'];
      const hasBlockedProtocol = blockedProtocols.some(protocol =>
        row.destination_url.toLowerCase().startsWith(protocol)
      );

      if (hasBlockedProtocol) {
        errors.push({
          row: rowNum,
          field: 'destination_url',
          message: 'Blocked URL protocol'
        });
        continue;
      }

      // Check if slug is provided and valid
      if (row.slug) {
        // Validate slug format
        const slugRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
        if (!slugRegex.test(row.slug)) {
          errors.push({
            row: rowNum,
            field: 'slug',
            message: 'Slug must be lowercase letters, numbers, hyphens, 2-50 characters, start and end with alphanumeric'
          });
          continue;
        }

        // Check if slug already exists
        const existingLink = await c.env.DB.prepare(`
          SELECT slug FROM links WHERE slug = ? AND status != 'deleted'
        `).bind(row.slug).first();

        if (existingLink) {
          errors.push({
            row: rowNum,
            field: 'slug',
            message: 'Slug already exists'
          });
          continue;
        }
      }

      // Validate channel if provided
      if (row.channel) {
        const validChannels = ['organic', 'social', 'email', 'sms', 'paid', 'referral'];
        if (!validChannels.includes(row.channel.toLowerCase())) {
          errors.push({
            row: rowNum,
            field: 'channel',
            message: `Channel must be one of: ${validChannels.join(', ')}`
          });
          continue;
        }
      }

      // Parse dates
      let expiresAt: string | undefined;
      if (row.expires_at) {
        try {
          const date = new Date(row.expires_at);
          if (isNaN(date.getTime())) {
            errors.push({
              row: rowNum,
              field: 'expires_at',
              message: 'Invalid date format'
            });
            continue;
          }
          expiresAt = date.toISOString();
        } catch {
          errors.push({
            row: rowNum,
            field: 'expires_at',
            message: 'Invalid date format'
          });
          continue;
        }
      }

      // Add parsed dates to row
      const processedRow = {
        ...row,
        expires_at: expiresAt,
        match_info: row.match_info ? JSON.parse(row.match_info) : undefined,
        is_offsite: row.is_offsite ? row.is_offsite.toLowerCase() === 'true' : undefined,
        show_preview: row.show_preview ? row.show_preview.toLowerCase() === 'true' : undefined,
        is_stable_evergreen: row.is_stable_evergreen ? row.is_stable_evergreen.toLowerCase() === 'true' : undefined
      };

      validRows.push(processedRow);
    }

    // Update job with statistics
    const status = errors.length === validRows.length ? 'failed' : 'processing';
    await c.env.DB.prepare(`
      UPDATE import_jobs
      SET status = ?, total_rows = ?, created_rows = ?, skipped_rows = ?, errors = ?, completed_at = ?
      WHERE job_id = ?
    `).bind(
      status,
      rows.length,
      validRows.length,
      errors.length,
      JSON.stringify(errors),
      status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      jobId
    ).run();

    // Simulate queue processing (in a real implementation, this would enqueue to Durable Objects)
    if (status === 'processing') {
      // In a real implementation, we would enqueue this for processing
      // For now, we'll process synchronously with a delay
      setTimeout(async () => {
        try {
          for (const row of validRows) {
            // Parse domain from destination URL
            let destinationDomain = '';
            try {
              const url = new URL(row.destination_url);
              destinationDomain = url.hostname;
            } catch {
              const match = row.destination_url.match(/https?:\/\/([^\/]+)/);
              if (match) {
                destinationDomain = match[1];
              }
            }

            // Create link
            const result = await c.env.DB.prepare(`
              INSERT INTO links (
                slug, destination_url, destination_domain, title, campaign, channel,
                status, redirect_code, show_offsite_preview, expires_at,
                created_at, updated_at, created_by, updated_by
              ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
              )
            `).bind(
              row.slug || null,
              row.destination_url,
              destinationDomain,
              row.title || null,
              row.campaign || null,
              row.channel || null,
              'active',
              302,
              row.show_preview || false,
              row.expires_at || null,
              new Date().toISOString(),
              new Date().toISOString(),
              'import',
              'import'
            ).run();

            // Update created count
            await c.env.DB.prepare(`
              UPDATE import_jobs SET created_rows = created_rows + 1 WHERE job_id = ?
            `).bind(jobId).run();
          }

          // Mark job as completed
          await c.env.DB.prepare(`
            UPDATE import_jobs
            SET status = 'completed', completed_at = ?
            WHERE job_id = ?
          `).bind(new Date().toISOString(), jobId).run();
        } catch (error) {
          console.error('Error processing import job:', error);
          await c.env.DB.prepare(`
            UPDATE import_jobs
            SET status = 'failed', completed_at = ?
            WHERE job_id = ?
          `).bind(new Date().toISOString(), jobId).run();
        }
      }, 1000); // 1 second delay to simulate async processing
    }

    return c.json({
      success: true,
      data: {
        job_id: jobId,
        status: status,
        total_rows: rows.length,
        valid_rows: validRows.length,
        invalid_rows: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : [] // Return first 10 errors
      }
    }, { status: 202 }); // 202 Accepted for async processing

  } catch (error) {
    console.error('Error processing CSV import:', error);
    return c.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    );
  }
});

export default app;