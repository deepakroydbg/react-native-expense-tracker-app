import { supabase } from '@/lib/supabase';

/** Parse params from both the query string and the hash fragment of a URL. */
function parseParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (s: string) => {
    if (!s) return;
    try {
      new URLSearchParams(s).forEach((v, k) => {
        if (!(k in out)) out[k] = v;
      });
    } catch {
      // ignore malformed
    }
  };
  const q = url.indexOf('?');
  const h = url.indexOf('#');
  if (q >= 0) add(url.slice(q + 1, h > q ? h : undefined));
  if (h >= 0) add(url.slice(h + 1));
  return out;
}

/**
 * Establishes a Supabase session from an OAuth / email-confirmation redirect URL.
 * Idempotent: if a session already exists it returns success without re-using the
 * (single-use) code, so the in-app flow and the deep-link callback can't conflict.
 */
export async function createSessionFromUrl(url: string): Promise<{ error: string | null }> {
  const params = parseParams(url);

  if (params.error_description || params.error) {
    return { error: params.error_description || params.error };
  }

  // Already signed in (the other path may have completed it) — done.
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return { error: null };

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    return { error: error ? error.message : null };
  }

  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    return { error: error ? error.message : null };
  }

  // No auth params and no session — nothing to establish.
  return { error: 'no-session' };
}
