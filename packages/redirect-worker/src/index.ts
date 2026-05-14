import { lookupLink, handleRedirect, handleHealth, handleRootRedirect } from './redirect';
import { renderOffsitePreview } from './offsite-preview';
import { enqueueClickEvent } from './click-event';

const FALLBACK_URL = 'https://www.shamrockrovers.ie/first-team-tickets';

export interface Env {
  DB: D1Database;
  CLICK_QUEUE?: Queue;
  FALLBACK_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.slice(1);

    if (pathname === 'health') {
      return handleHealth(env.DB, env.CLICK_QUEUE);
    }

    if (pathname === '') {
      return handleRootRedirect();
    }

    // Offsite preview continue
    if (pathname.endsWith('/continue')) {
      const slug = pathname.replace('/continue', '');
      const { link } = await lookupLink(env.DB, slug);
      if (!link) {
        return new Response(null, { status: 302, headers: { Location: FALLBACK_URL } });
      }
      try { await enqueueClickEvent(env.CLICK_QUEUE ?? null, env.DB, slug, request); } catch {}
      return handleRedirect(link);
    }

    try {
      const { link } = await lookupLink(env.DB, pathname);

      if (link) {
        try { await enqueueClickEvent(env.CLICK_QUEUE ?? null, env.DB, pathname, request); } catch (e) { console.error('Click tracking error:', e); }

        if ((link as any).is_offsite_ticket) {
          const destUrl = new URL(link.destination_url || link.destination);
          return renderOffsitePreview(destUrl.hostname, pathname);
        }

        return handleRedirect(link);
      }

      return new Response(null, { status: 302, headers: { Location: FALLBACK_URL } });
    } catch (error) {
      console.error('Redirect error:', error);
      return new Response(null, { status: 302, headers: { Location: FALLBACK_URL } });
    }
  },
};
