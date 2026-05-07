import { Context, Hono } from 'hono';
import { eq } from 'drizzle-orm/expressions';
import { applyRateLimit } from '../../../rate-limit';

const app = new Hono();
applyRateLimit(app);

interface ImportError {
  row: number;
  field: string;
  message: string;
}

// GET /api/import/csv/{jobId}/status - Get import job status
app.get('/:jobId', async (c) => {
  try {
    const { jobId } = c.req.param();

    // Get job details
    const job = await c.env.DB.prepare(`
      SELECT
        job_id,
        status,
        total_rows,
        created_rows,
        skipped_rows,
        errors,
        created_at,
        completed_at
      FROM import_jobs
      WHERE job_id = ?
    `).bind(jobId).first();

    if (!job) {
      return c.json(
        {
          success: false,
          error: 'Import job not found'
        },
        { status: 404 }
      );
    }

    // Parse errors
    let parsedErrors: ImportError[] = [];
    try {
      parsedErrors = job.errors ? JSON.parse(job.errors) : [];
    } catch (e) {
      console.error('Error parsing job errors:', e);
      parsedErrors = [];
    }

    // Calculate progress percentage
    const progress = job.total_rows > 0 ?
      Math.round((job.created_rows / job.total_rows) * 100) : 0;

    return c.json({
      success: true,
      data: {
        job_id: job.job_id,
        status: job.status,
        progress,
        total_rows: job.total_rows,
        created_rows: job.created_rows,
        skipped_rows: job.skipped_rows,
        errors: parsedErrors,
        created_at: job.created_at,
        completed_at: job.completed_at,
        estimated_remaining: job.status === 'processing' && job.created_rows < job.total_rows
          ? `${job.total_rows - job.created_rows} rows remaining`
          : null
      }
    });

  } catch (error) {
    console.error('Error fetching job status:', error);
    return c.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
});

export default app;