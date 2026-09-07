import {
  beginOAuth,
  consumeOAuthHash,
  getBearerToken,
  getSession,
  getUser,
  signInWithPassword,
  signOut as supabaseSignOut,
  signUp as supabaseSignUp,
  subscribeToSession,
  type SupabaseSession,
} from "./supabase";
import { GROK_PROVIDERS } from "./providers";
import { useEffect, useState } from "react";

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";
export { GROK_PROVIDERS, getBearerToken };

export type AppSession = { user: { id: string; name: string | null; email: string | null; image: string | null } };

function toAppSession(session: SupabaseSession | null): AppSession | null {
  if (!session?.user?.id) return null;
  const meta = session.user.user_metadata ?? {};
  return { user: { id: session.user.id, name: typeof meta.display_name === "string" ? meta.display_name : typeof meta.name === "string" ? meta.name : null, email: session.user.email ?? null, image: typeof meta.avatar_url === "string" ? meta.avatar_url : null } };
}

let currentSession: SupabaseSession | null = null;
let initialized = false;

async function initializeSession(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const oauth = consumeOAuthHash();
  if (oauth) {
    const user = await getUser(oauth.access_token);
    currentSession = user ? { ...oauth, user } : null;
    if (currentSession) {
      localStorage.setItem("big-cruise.supabase.session", JSON.stringify(currentSession));
      history.replaceState({}, document.title, location.pathname + location.search);
    }
  } else {
    currentSession = await getSession();
  }
}

async function ensureSession(): Promise<SupabaseSession | null> {
  await initializeSession();
  currentSession = await getSession();
  return currentSession;
}

export const authClient = {
  signUp: {
    async email(input: { name: string; email: string; password: string }) {
      const session = await supabaseSignUp(input.email, input.password, input.name);
      currentSession = session;
      return { data: session, error: null };
    },
  },
  signIn: {
    async email(input: { email: string; password: string }) {
      const session = await signInWithPassword(input.email, input.password);
      currentSession = session;
      return { data: session, error: null };
    },
    async oauth2(input: { providerId: string }) {
      await signIn(input.providerId);
      return { data: null, error: null };
    },
  },
  async signOut() {
    await supabaseSignOut();
    currentSession = null;
  },
  async getSession() { return ensureSession(); },
  useSession() {
    const [state, setState] = useState<{ data: AppSession | null; isPending: boolean }>({ data: null, isPending: true });
    useEffect(() => {
      const alive = true;
      void ensureSession().then((session) => { if (alive) setState({ data: toAppSession(session), isPending: false }); });
      return subscribeToSession(() => { void ensureSession().then((session) => { if (alive) setState({ data: toAppSession(session), isPending: false }); }); });
    }, []);
    return state;
  },
};

export async function signIn(providerId: string): Promise<void> {
  if (providerId === "grok-google" || providerId === "google") {
    beginOAuth("google");
    return;
  }
  throw new Error("That sign-in provider is not configured.");
}

export async function signOut(redirectTo = "/"): Promise<void> {
  await supabaseSignOut();
  currentSession = null;
  if (typeof window !== "undefined") window.location.assign(redirectTo);
}

export const supabaseAuth = { signUp: supabaseSignUp, signInWithPassword, signOut: supabaseSignOut };
