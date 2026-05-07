import { Context, Hono } from 'hono';

const app = new Hono();

interface ArchiveResponse {
  date: string;
  records: number;
  download_url: string;
}

// GET /api/archives/download/{date} - Download archive for a specific date
app.get('/', async (c) => {
  try {
    const date = c.req.param('date');

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // Parse and validate the date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return c.json(
        { error: 'Invalid date' },
        { status: 400 }
      );
    }

    // Extract year, month, day for R2 key path
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');

    // Construct R2 key path
    const r2Key = `archive/${year}/${month}/${date}.json`;

    // List R2 bucket keys for the date
    try {
      const listResponse = await c.env.ARCHIVE_BUCKET.list({
        prefix: `archive/${year}/${month}/`
      });

      // Check if the archive exists
      const archiveExists = listResponse.objects?.some(obj => obj.key === r2Key) || false;

      if (!archiveExists) {
        return c.json(
          { error: `No archive found for date: ${date}` },
          { status: 404 }
        );
      }

      // Get the object to count records
      const object = await c.env.ARCHIVE_BUCKET.get(r2Key);

      if (!object) {
        return c.json(
          { error: `Archive found but inaccessible for date: ${date}` },
          { status: 404 }
        );
      }

      // Get the text content
      const text = await object.text();
      let records = 0;

      try {
        // Parse the JSON to count records
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          records = data.length;
        } else if (data && typeof data === 'object') {
          // If it's an object with a records field
          records = data.records || 1;
        }
      } catch (parseError) {
        console.warn('Failed to parse archive JSON:', parseError);
        // If JSON parsing fails, we'll estimate based on file size
        // Assume ~100 characters per record
        records = Math.floor(text.length / 100);
      }

      // Generate signed URL for secure download
      const signedUrl = await c.env.ARCHIVE_BUCKET.sign(
        r2Key,
        {
          expiresIn: 300, // 5 minutes
          downloadable: true
        }
      );

      // Construct the public URL (replace with your actual R2 domain)
      const publicUrl = signedUrl.replace('https://your-r2-domain.r2.dev', 'https://rovrs-admin-storage.r2.dev');

      const response: ArchiveResponse = {
        date,
        records,
        download_url: publicUrl
      };

      return c.json(response);

    } catch (r2Error) {
      console.error('R2 access error:', r2Error);
      return c.json(
        { error: 'Failed to access archive storage' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return c.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export default app;