const SUPABASE_URL = "https://qdeozgkmrqectbuhetvc.supabase.co";
const SUPABASE_KEY = "sb_publishable_jM4eku7b7m_GG264BCMeyg_Uv_uTuKk";
const STORAGE_KEY = "big-cruise.supabase.session";
const SESSION_EVENT = "big-cruise:supabase-session";

export type SupabaseUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user: SupabaseUser;
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: SupabaseUser;
  error?: string;
  error_description?: string;
  msg?: string;
};

function headers(accessToken?: string): HeadersInit {
  return {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function normalizeSession(body: AuthResponse): SupabaseSession | null {
  if (!body.access_token || !body.refresh_token || !body.user) return null;
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_in: body.expires_in ?? 3600,
    expires_at: body.expires_at ?? Math.floor(Date.now() / 1000) + (body.expires_in ?? 3600),
    user: body.user,
  };
}

function readStoredSession(): SupabaseSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SupabaseSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: SupabaseSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT));
  } catch {
    /* storage unavailable */
  }
}

export function getBearerToken(): string | null {
  return readStoredSession()?.access_token ?? null;
}

export function getStoredSession(): SupabaseSession | null {
  return readStoredSession();
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers ?? {}) },
  });
}

export async function getUser(accessToken: string): Promise<SupabaseUser | null> {
  const response = await request("/auth/v1/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as SupabaseUser;
  return user.id ? user : null;
}

export async function signUp(email: string, password: string, name: string): Promise<SupabaseSession | null> {
  const response = await request("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, data: { display_name: name, name } }),
  });
  const body = (await response.json()) as AuthResponse;
  if (!response.ok) throw new Error(body.error_description ?? body.msg ?? body.error ?? "Sign up failed");
  const session = normalizeSession(body);
  if (session) writeStoredSession(session);
  return session;
}

export async function signInWithPassword(email: string, password: string): Promise<SupabaseSession> {
  const response = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as AuthResponse;
  if (!response.ok) throw new Error(body.error_description ?? body.msg ?? body.error ?? "Sign in failed");
  const session = normalizeSession(body);
  if (!session) throw new Error("Supabase returned no session");
  writeStoredSession(session);
  return session;
}

export async function refreshSession(session: SupabaseSession): Promise<SupabaseSession | null> {
  if (!session.refresh_token) return null;
  const response = await request("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!response.ok) {
    writeStoredSession(null);
    return null;
  }
  const body = (await response.json()) as AuthResponse;
  const next = normalizeSession(body);
  if (!next) {
    writeStoredSession(null);
    return null;
  }
  writeStoredSession(next);
  return next;
}

export async function getSession(): Promise<SupabaseSession | null> {
  const session = readStoredSession();
  if (!session) return null;
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt && expiresAt - Math.floor(Date.now() / 1000) > 60) return session;
  return refreshSession(session);
}

export async function signOut(): Promise<void> {
  const token = getBearerToken();
  if (token) {
    await request("/auth/v1/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
  }
  writeStoredSession(null);
}

export function subscribeToSession(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => callback();
  window.addEventListener(SESSION_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SESSION_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function consumeOAuthHash(): SupabaseSession | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number(params.get("expires_in") ?? 3600),
    expires_at: Number(params.get("expires_at") ?? Math.floor(Date.now() / 1000) + Number(params.get("expires_in") ?? 3600)),
    user: { id: "", email: null },
  };
}

export function beginOAuth(provider: "google"): void {
  if (typeof window === "undefined") return;
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  url.searchParams.set("provider", provider);
  url.searchParams.set("redirect_to", redirectTo);
  url.searchParams.set("response_type", "token");
  window.location.assign(url.toString());
}

export { SUPABASE_URL, SUPABASE_KEY };
