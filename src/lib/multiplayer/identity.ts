/**
 * Multiplayer identity binding.
 * Server derives player id from a validated Supabase access token.
 * Clients never choose their own authoritative userId.
 */
import { getSessionUser, UnauthorizedError, type VerifiedUser } from "@/lib/auth/verify.server";

export type MultiplayerIdentity = {
  userId: string;
  email: string | null;
  /** Display name is cosmetic only — never used as identity. */
  displayName: string;
};

export type IdentityErrorCode =
  | "missing_token"
  | "invalid_token"
  | "auth_disabled_online"
  | "forged_user_id";

export class IdentityError extends Error {
  readonly code: IdentityErrorCode;
  constructor(code: IdentityErrorCode, message: string) {
    super(message);
    this.name = "IdentityError";
    this.code = code;
  }
}

/**
 * Resolve the multiplayer player from the Authorization bearer.
 * `claimedUserId` if provided must match the verified user or is rejected.
 */
export async function resolveMultiplayerIdentity(opts: {
  bearerToken?: string;
  claimedUserId?: string;
  displayName?: string;
  /** When true, refuse unauthenticated play (online rooms). */
  requireAuth?: boolean;
}): Promise<MultiplayerIdentity> {
  const requireAuth = opts.requireAuth !== false;
  const user = await getSessionUser(opts.bearerToken);

  if (!user) {
    if (requireAuth) {
      throw new IdentityError(
        opts.bearerToken ? "invalid_token" : "missing_token",
        opts.bearerToken ? "Session is invalid or expired." : "Authentication required.",
      );
    }
    throw new IdentityError("auth_disabled_online", "Online rooms require a signed-in account.");
  }

  if (opts.claimedUserId && opts.claimedUserId !== user.id) {
    throw new IdentityError("forged_user_id", "Claimed user id does not match the session.");
  }

  const displayName =
    opts.displayName?.trim() ||
    user.email?.split("@")[0] ||
    `Cruise-${user.id.slice(0, 6)}`;

  return { userId: user.id, email: user.email, displayName: displayName.slice(0, 18) };
}

export async function requireMultiplayerUser(bearerToken?: string): Promise<VerifiedUser> {
  const user = await getSessionUser(bearerToken);
  if (!user) throw new UnauthorizedError();
  return user;
}
