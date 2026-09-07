import { create } from "zustand";
import type { GameSlug } from "@/lib/games/catalog";
import {
  applyAward,
  applyName,
  applyProfile,
  applySitDown,
  applyWin,
  POINT_TABLE,
  emptyDocument,
  loadDocument,
  saveDocument,
  type BadgeId,
  type BadgeRecord,
  type IdentityDocument,
  type IdentityEvent,
  type LedgerEntry,
  type MatchRecord,
  type PointAction,
} from "@/lib/cruise/persist";
import { getSession } from "@/lib/auth/supabase";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/auth/supabase";

export {
  BADGE_CATALOG,
  PERSISTENCE,
  POINT_TABLE,
  initials,
  playerLevel,
  type Badge,
  type BadgeId,
  type BadgeRecord,
  type CommunityStatus,
  type GameStat,
  type LedgerEntry,
  type MatchRecord,
  type PersistenceKind,
  type PointAction,
} from "@/lib/cruise/persist";

export type Toast = {
  id: string;
  title: string;
  body?: string;
};

type PlayerState = {
  name: string;
  handle?: string;
  line?: string;
  photo?: string;
  muted: boolean;
  cruiseId: string;
  joinedAt: string;
  points: number;
  badges: BadgeId[];
  badgeRecords: BadgeRecord[];
  stats: IdentityDocument["stats"];
  recent: GameSlug[];
  ledger: LedgerEntry[];
  matches: MatchRecord[];
  dailyAt?: string;
  ready: boolean;
  toasts: Toast[];
  hydrate: () => void;
  setName: (name: string) => void;
  setProfile: (patch: { name?: string; handle?: string; line?: string; photo?: string | null }) => void;
  toggleMute: () => void;
  recordPlay: (slug: GameSlug, hosted?: boolean) => void;
  recordWin: (slug: GameSlug) => void;
  award: (action: PointAction, note?: string) => void;
  dismissToast: (id: string) => void;
};

function toast(title: string, body?: string): Toast {
  return { id: `t${Date.now()}${Math.random().toString(16).slice(2, 6)}`, title, body };
}

function eventsToToasts(events: IdentityEvent[]): Toast[] {
  return events.map((e) =>
    e.type === "points" ? toast(`+${e.amount} BCH`, e.note) : toast(e.name, "Unlocked"),
  );
}

function fromDoc(doc: IdentityDocument): Pick<
  PlayerState,
  | "name"
  | "handle"
  | "line"
  | "photo"
  | "cruiseId"
  | "joinedAt"
  | "points"
  | "badges"
  | "badgeRecords"
  | "stats"
  | "recent"
  | "ledger"
  | "matches"
  | "dailyAt"
> {
  return {
    name: doc.identity.name,
    handle: doc.identity.handle,
    line: doc.identity.line,
    photo: doc.identity.photo,
    cruiseId: doc.identity.cruiseId,
    joinedAt: doc.identity.joinedAt,
    points: doc.points,
    badges: doc.badges.map((b) => b.id),
    badgeRecords: doc.badges,
    stats: doc.stats,
    recent: doc.recent,
    ledger: doc.ledger,
    matches: doc.matches,
    dailyAt: doc.dailyAt,
  };
}

function currentDoc(s: PlayerState): IdentityDocument {
  return s.ready ? toDoc(s) : loadDocument();
}

function toDoc(s: PlayerState): IdentityDocument {
  return {
    v: 1,
    kind: "local-prototype",
    identity: {
      cruiseId: s.cruiseId,
      name: s.name,
      joinedAt: s.joinedAt || new Date().toISOString(),
      status: s.badges.includes("host") ? "host" : "member",
      handle: s.handle,
      line: s.line,
      photo: s.photo,
    },
    points: s.points,
    ledger: s.ledger,
    badges: s.badgeRecords.length ? s.badgeRecords : s.badges.map((id) => ({ id, earnedAt: s.joinedAt })),
    stats: s.stats,
    recent: s.recent,
    matches: s.matches,
    dailyAt: s.dailyAt,
  };
}

const blank = emptyDocument();

type RemoteProfile = {
  id: string;
  username: string | null;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  big_cruise_id: string;
  bch_points: number;
  level: number;
  games_played: number;
  wins: number;
  line: string | null;
  role: string;
  daily_at: string | null;
  created_at: string;
};

type RemoteGameStat = { game: GameSlug; played: number; won: number; last_played: string | null };
type RemoteAchievement = { achievement_id: BadgeId; earned_at: string };
type RemoteTransaction = { id: string; transaction_type: PointAction; amount: number; reference: string | null; created_at: string };
type RemoteMatch = { id: string; game: GameSlug; result: "sit" | "win"; hosted: boolean; created_at: string };

function remoteHeaders(token: string) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function remoteRequest(path: string, token: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}${path}`, { ...init, headers: { ...remoteHeaders(token), ...(init.headers ?? {}) } });
}

async function remoteUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

async function ensureRemoteProfile(token: string): Promise<RemoteProfile | null> {
  const response = await remoteRequest("/rest/v1/rpc/cruise_ensure_profile", token, { method: "POST", body: "{}" });
  if (!response.ok) return null;
  return (await response.json()) as RemoteProfile;
}

async function fetchRemoteDocument(): Promise<IdentityDocument | null> {
  const session = await getSession();
  if (!session) return null;
  const profile = await ensureRemoteProfile(session.access_token);
  if (!profile) return null;
  const uid = profile.id;
  const query = encodeURIComponent(`user_id=eq.${uid}`);
  const [statsRes, achievementsRes, transactionsRes, matchesRes] = await Promise.all([
    remoteRequest(`/rest/v1/game_stats?select=game,played,won,last_played&${query}&order=last_played.desc`, session.access_token),
    remoteRequest(`/rest/v1/user_achievements?select=achievement_id,earned_at&${query}&order=earned_at.asc`, session.access_token),
    remoteRequest(`/rest/v1/bch_transactions?select=id,transaction_type,amount,reference,created_at&${query}&order=created_at.desc&limit=100`, session.access_token),
    remoteRequest(`/rest/v1/game_matches?select=id,game,result,hosted,created_at&${query}&order=created_at.desc&limit=40`, session.access_token),
  ]);

  const [stats, achievements, transactions, matches] = await Promise.all([
    statsRes.ok ? statsRes.json() as Promise<RemoteGameStat[]> : Promise.resolve([]),
    achievementsRes.ok ? achievementsRes.json() as Promise<RemoteAchievement[]> : Promise.resolve([]),
    transactionsRes.ok ? transactionsRes.json() as Promise<RemoteTransaction[]> : Promise.resolve([]),
    matchesRes.ok ? matchesRes.json() as Promise<RemoteMatch[]> : Promise.resolve([]),
  ]);

  const statsMap: IdentityDocument["stats"] = {};
  for (const stat of stats) {
    statsMap[stat.game] = { played: stat.played ?? 0, won: stat.won ?? 0, lastPlayed: stat.last_played ?? undefined };
  }

  const badgeRecords: BadgeRecord[] = achievements.map((a) => ({ id: a.achievement_id, earnedAt: a.earned_at }));
  if (!badgeRecords.some((b) => b.id === "member")) {
    badgeRecords.unshift({ id: "member", earnedAt: profile.created_at });
  }

  const ledger: LedgerEntry[] = transactions.map((tx) => ({
    id: tx.id,
    action: tx.transaction_type,
    amount: tx.amount,
    note: tx.reference ?? tx.transaction_type,
    at: tx.created_at,
  }));

  const remoteMatches: MatchRecord[] = matches.map((match) => ({
    id: match.id,
    game: match.game,
    result: match.result,
    hosted: Boolean(match.hosted),
    at: match.created_at,
  }));

  const recent = remoteMatches
    .map((match) => match.game)
    .filter((game, index, list) => list.indexOf(game) === index)
    .slice(0, 8);

  return {
    v: 1,
    kind: "local-prototype",
    identity: {
      cruiseId: profile.big_cruise_id,
      name: profile.display_name,
      joinedAt: profile.created_at,
      status: profile.role === "admin" ? "og" : badgeRecords.some((b) => b.id === "host") ? "host" : "member",
      handle: profile.username ?? undefined,
      line: profile.line ?? undefined,
      photo: profile.avatar_url ?? undefined,
    },
    points: profile.bch_points ?? 0,
    ledger,
    badges: badgeRecords,
    stats: statsMap,
    recent,
    matches: remoteMatches,
    dailyAt: profile.daily_at ?? undefined,
  };
}

async function updateRemoteProfile(patch: { name?: string; handle?: string; line?: string; photo?: string | null }): Promise<IdentityDocument | null> {
  const session = await getSession();
  if (!session) return null;
  const body = {
    p_name: patch.name ?? null,
    p_handle: patch.handle ?? null,
    p_line: patch.line ?? null,
    p_photo: patch.photo === undefined ? null : patch.photo ?? "",
  };
  const response = await remoteRequest("/rest/v1/rpc/cruise_update_profile", session.access_token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return fetchRemoteDocument();
}

async function recordRemotePlay(slug: GameSlug, hosted: boolean): Promise<IdentityDocument | null> {
  const session = await getSession();
  if (!session) return null;
  const response = await remoteRequest("/rest/v1/rpc/cruise_record_play", session.access_token, {
    method: "POST",
    body: JSON.stringify({ p_game: slug, p_hosted: hosted }),
  });
  if (!response.ok) throw new Error(await response.text());
  return fetchRemoteDocument();
}

async function recordRemoteWin(slug: GameSlug): Promise<IdentityDocument | null> {
  const session = await getSession();
  if (!session) return null;
  const response = await remoteRequest("/rest/v1/rpc/cruise_record_win", session.access_token, {
    method: "POST",
    body: JSON.stringify({ p_game: slug }),
  });
  if (!response.ok) throw new Error(await response.text());
  return fetchRemoteDocument();
}

async function awardRemote(action: PointAction, note?: string): Promise<IdentityDocument | null> {
  const session = await getSession();
  if (!session) return null;
  const amount = POINT_TABLE[action].amount;
  const response = await remoteRequest("/rest/v1/rpc/credit_bch", session.access_token, {
    method: "POST",
    body: JSON.stringify({ p_user: session.user.id, p_type: action, p_amount: amount, p_reference: note ?? POINT_TABLE[action].label }),
  });
  if (!response.ok) throw new Error(await response.text());
  return fetchRemoteDocument();
}

export const usePlayer = create<PlayerState>((set, get) => ({
  ...fromDoc(blank),
  muted: false,
  ready: false,
  toasts: [],
  hydrate: () => {
    if (get().ready) return;
    void fetchRemoteDocument().then((remote) => {
      if (remote) {
        set({ ...fromDoc(remote), ready: true });
        return;
      }
      set({ ...fromDoc(loadDocument()), ready: true });
    });
  },
  setName: (name) => {
    void (async () => {
      const remote = await updateRemoteProfile({ name });
      if (remote) {
        set({ ...fromDoc(remote), ready: true });
        return;
      }
      const s = get();
      const doc = applyName(currentDoc(s), name);
      saveDocument(doc);
      set({ ...fromDoc(doc), ready: true });
    })();
  },
  setProfile: (patch) => {
    void (async () => {
      const remote = await updateRemoteProfile(patch);
      if (remote) {
        set({ ...fromDoc(remote), ready: true });
        return;
      }
      const s = get();
      const doc = applyProfile(currentDoc(s), patch);
      saveDocument(doc);
      set({ ...fromDoc(doc), ready: true });
    })();
  },
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  award: (action, note) => {
    void (async () => {
      const remote = await awardRemote(action, note);
      if (remote) {
        set({ ...fromDoc(remote), ready: true });
        return;
      }
      const s = get();
      const { doc, events } = applyAward(currentDoc(s), action, note);
      saveDocument(doc);
      set({ ...fromDoc(doc), ready: true, toasts: [...eventsToToasts(events), ...s.toasts].slice(0, 3) });
    })();
  },
  recordPlay: (slug, hosted) => {
    void (async () => {
      const before = get();
      const remote = await recordRemotePlay(slug, Boolean(hosted));
      if (remote) {
        const events: IdentityEvent[] = [];
        const previous = before.stats[slug]?.played ?? 0;
        const current = remote.stats[slug]?.played ?? 0;
        if (current > previous) events.push({ type: "points", action: "play", amount: 5, note: "Sat down" });
        set({ ...fromDoc(remote), ready: true, toasts: [...eventsToToasts(events), ...before.toasts].slice(0, 3) });
        return;
      }
      const s = get();
      const { doc, events } = applySitDown(currentDoc(s), slug, hosted);
      saveDocument(doc);
      set({ ...fromDoc(doc), ready: true, toasts: [...eventsToToasts(events), ...s.toasts].slice(0, 3) });
    })();
  },
  recordWin: (slug) => {
    void (async () => {
      const before = get();
      const remote = await recordRemoteWin(slug);
      if (remote) {
        const events: IdentityEvent[] = [];
        const previous = before.stats[slug]?.won ?? 0;
        const current = remote.stats[slug]?.won ?? 0;
        if (current > previous) events.push({ type: "points", action: "win", amount: 25, note: "Win" });
        set({ ...fromDoc(remote), ready: true, toasts: [...eventsToToasts(events), ...before.toasts].slice(0, 3) });
        return;
      }
      const s = get();
      const { doc, events } = applyWin(currentDoc(s), slug);
      saveDocument(doc);
      set({ ...fromDoc(doc), ready: true, toasts: [...eventsToToasts(events), ...s.toasts].slice(0, 3) });
    })();
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function playIf(muted: boolean, fn: () => void) {
  if (!muted) fn();
}
