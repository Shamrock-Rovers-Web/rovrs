interface Env {
  DB: D1Database;
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const formData = await context.request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return json({ success: false, error: 'No file provided' }, 400);
    }

    const csvText = await file.text();
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      return json({ success: false, error: 'CSV must have headers and at least one row' }, 400);
    }

    const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(l => parseCsvLine(l));

    const slugIdx = headers.indexOf('slug');
    const urlIdx = headers.indexOf('destination_url');
    if (urlIdx === -1) {
      return json({ success: false, error: 'CSV must have a destination_url column' }, 400);
    }

    const created: any[] = [];
    const errors: any[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const destinationUrl = row[urlIdx]?.trim();

      if (!destinationUrl) {
        errors.push({ row: rowNum, error: 'destination_url is required' });
        continue;
      }

      try {
        const url = new URL(destinationUrl);
        if (['javascript:', 'data:', 'file:', 'ftp:'].includes(url.protocol)) {
          errors.push({ row: rowNum, error: 'Blocked URL protocol' });
          continue;
        }
      } catch {
        errors.push({ row: rowNum, error: 'Invalid URL format' });
        continue;
      }

      const slug = slugIdx >= 0 ? row[slugIdx]?.trim() : '';
      if (!slug) {
        errors.push({ row: rowNum, error: 'slug is required' });
        continue;
      }

      if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(slug)) {
        errors.push({ row: rowNum, error: 'Invalid slug format' });
        continue;
      }

      const existing = await context.env.DB.prepare(
        "SELECT id FROM links WHERE slug = ? AND status != 'deleted'"
      ).bind(slug).first();
      if (existing) {
        errors.push({ row: rowNum, error: 'Slug already exists' });
        continue;
      }

      const getVal = (name: string) => {
        const idx = headers.indexOf(name);
        return idx >= 0 ? row[idx]?.trim() || null : null;
      };

      let destinationDomain: string | null = null;
      try { destinationDomain = new URL(destinationUrl).hostname; } catch {}

      const id = crypto.randomUUID();

      await context.env.DB.prepare(`
        INSERT INTO links (id, slug, destination_url, destination_domain, title, campaign, channel,
          sponsor, opponent, competition, match_date, home_away, status, redirect_code,
          is_offsite_ticket, show_offsite_preview, expires_at, notes, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, slug, destinationUrl, destinationDomain,
        getVal('title'), getVal('campaign'), getVal('channel'),
        getVal('sponsor'), getVal('opponent'), getVal('competition'),
        getVal('match_date'), getVal('home_away'),
        'active', 302, 0, 0, getVal('expires_at'), getVal('notes'),
        'csv-import', now
      ).run();

      created.push({ row: rowNum, slug, id });
    }

    return json({
      success: true,
      data: {
        total_rows: rows.length,
        created: created.length,
        errors: errors.length,
        error_details: errors.slice(0, 20),
        created_details: created,
      },
    }, 201);
  } catch (error) {
    console.error('Error importing CSV:', error);
    return json({ success: false, error: 'Failed to import CSV' }, 500);
  }
};
