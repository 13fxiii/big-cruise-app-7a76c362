import { getRequest } from "@tanstack/react-start/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase";

const AUTH_ENABLED = () => process.env.VITE_AUTH_ENABLED !== "false";

export const authConfigured = true;
export const DEV_USER_ID = "dev-user";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type VerifiedUser = { id: string; email: string | null };

/** Validate the bearer against Supabase Auth itself. No local Better Auth session is accepted. */
export async function getSessionUser(bearerToken?: string): Promise<VerifiedUser | null> {
  if (!AUTH_ENABLED()) return null;
  const request = getRequest();
  const token = bearerToken?.trim() || request?.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return null;
    const user = (await response.json()) as { id?: string; email?: string | null };
    if (!user.id) return null;
    return { id: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}

export async function requireUserId(bearerToken?: string): Promise<string> {
  if (!AUTH_ENABLED()) {
    if (process.env.DATABASE_URL?.trim()) {
      throw new Error("Auth is disabled while a real database is configured; refusing shared identity.");
    }
    return DEV_USER_ID;
  }
  const user = await getSessionUser(bearerToken);
  if (!user) throw new UnauthorizedError();
  return user.id;
}
