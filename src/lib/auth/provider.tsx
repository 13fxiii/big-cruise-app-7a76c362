import type { ReactNode } from "react";

/**
 * Stable app-wide provider mount point. Supabase Auth is intentionally
 * context-free here; `src/lib/auth/client.ts` owns the browser session state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
