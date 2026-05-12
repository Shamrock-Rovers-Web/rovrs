interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const status = url.searchParams.get('status') || '';
    const channel = url.searchParams.get('channel') || '';
    const campaign = url.searchParams.get('campaign') || '';
    const sponsor = url.searchParams.get('sponsor') || '';

    const conditions: string[] = ["status != 'deleted'"];
    const params: any[] = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (channel) { conditions.push('channel = ?'); params.push(channel); }
    if (campaign) { conditions.push('campaign = ?'); params.push(campaign); }
    if (sponsor) { conditions.push('sponsor = ?'); params.push(sponsor); }

    const where = conditions.join(' AND ');

    const result = await context.env.DB.prepare(
      `SELECT * FROM links WHERE ${where} ORDER BY created_at DESC`
    ).bind(...params).all();

    const headers = [
      'id', 'slug', 'destination_url', 'title', 'campaign', 'channel',
      'status', 'redirect_code', 'is_qr', 'is_offsite_ticket',
      'show_offsite_preview', 'is_protected', 'expires_at', 'match_date',
      'opponent', 'competition', 'home_away', 'sponsor', 'owner',
      'created_by', 'created_at', 'updated_at', 'notes'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(',')];
    for (const row of result.results) {
      csvRows.push(headers.map(h => escapeCsv((row as any)[h])).join(','));
    }

    const csv = csvRows.join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="rovrs-links-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to export' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
