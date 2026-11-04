import type { AppSettings, Category, EnvelopeAid } from "./defaults";
import type { WorkspaceSnapshot } from "./workspace";

type Envelope = { id: string; cat: string; name: string; planned: number };
type Income = { amount: number };

export function getCats(ws: WorkspaceSnapshot): Category[] {
  return ws.settings?.categories?.length ? ws.settings.categories : [];
}

export function catOf(ws: WorkspaceSnapshot, id: string): Category {
  return (
    getCats(ws).find((c) => c.id === id) || {
      id,
      name: id,
      short: id,
      color: "var(--muted)",
      kind: "expense",
      defaultEnvs: [],
    }
  );
}

export function incomeTotal(b?: { incomes: unknown[] } | null) {
  if (!b) return 0;
  return (b.incomes as Income[]).reduce((a, i) => a + (Number(i.amount) || 0), 0);
}

export function catAlloc(b: { incomes: unknown[]; pct: Record<string, number> }, cat: string) {
  return Math.round((incomeTotal(b) * (Number(b.pct?.[cat]) || 0)) / 100);
}

export function pctTotal(pct: Record<string, number>, cats: Category[]) {
  return cats.reduce((a, c) => a + (Number(pct?.[c.id]) || 0), 0);
}

export function monthTx(ws: WorkspaceSnapshot, month: string) {
  return ws.transactions.filter((t) => t.month === month);
}

export function monthAids(ws: WorkspaceSnapshot, month: string): EnvelopeAid[] {
  return (ws.settings.aids || []).filter((a) => a.month === month);
}

export function envAidDelta(ws: WorkspaceSnapshot, month: string, envId: string) {
  let inn = 0;
  let out = 0;
  monthAids(ws, month).forEach((a) => {
    if (a.toEnvId === envId) inn += Number(a.amount) || 0;
    if (a.fromEnvId === envId) out += Number(a.amount) || 0;
  });
  return { in: inn, out, net: inn - out };
}

export function envNameById(ws: WorkspaceSnapshot, month: string, id: string) {
  const envs = (ws.budgets[month]?.envelopes || []) as Envelope[];
  return envs.find((e) => e.id === id)?.name || "Enveloppe";
}

function aidSourceRank(ws: WorkspaceSnapshot, env: Envelope, targetCat: string) {
  if (env.cat === targetCat) return 0;
  const kind = catOf(ws, env.cat).kind;
  if (kind === "transfer") return 1;
  if (kind === "expense") return 2;
  return 3;
}

export type AidSource = {
  env: Envelope;
  rest: number;
  mode: "surplus" | "emergency";
  rank: number;
};

export function listAidSources(
  ws: WorkspaceSnapshot,
  month: string,
  targetEnv: Envelope,
): AidSource[] {
  const b = ws.budgets[month];
  if (!b) return [];
  return (b.envelopes as Envelope[])
    .filter((e) => e.id !== targetEnv.id)
    .map((e) => {
      const st = envStats(ws, month, e);
      return {
        env: e,
        rest: Math.max(0, st.rest),
        mode: (e.cat === targetEnv.cat ? "surplus" : "emergency") as "surplus" | "emergency",
        rank: aidSourceRank(ws, e, targetEnv.cat),
      };
    })
    .filter((x) => x.rest > 0)
    .sort(
      (a, b2) =>
        a.rank - b2.rank ||
        b2.rest - a.rest ||
        a.env.name.localeCompare(b2.env.name, "fr"),
    );
}

export function suggestAidPlan(sources: AidSource[], shortfall: number) {
  const plan: Record<string, number> = {};
  let left = shortfall;
  for (const src of sources) {
    if (left <= 0) break;
    const take = Math.min(src.rest, left);
    if (take > 0) {
      plan[src.env.id] = take;
      left -= take;
    }
  }
  return { plan, covered: shortfall - left, left };
}

export const ENV_STATUS = {
  ok: { label: "Normal", color: "var(--accent)" },
  warn: { label: "Attention", color: "var(--warn)" },
  near: { label: "Presque atteint", color: "var(--near)" },
  full: { label: "Atteint", color: "var(--near)" },
  over: { label: "Dépassé", color: "var(--over)" },
} as const;

export function envStats(
  ws: WorkspaceSnapshot,
  month: string,
  env: Envelope,
  thresholds?: AppSettings["thresholds"],
) {
  const spent = monthTx(ws, month)
    .filter((t) => t.envId === env.id)
    .reduce((a, t) => a + t.amount, 0);
  const basePlanned = Number(env.planned) || 0;
  const aids = envAidDelta(ws, month, env.id);
  const planned = basePlanned + aids.net;
  const pct = planned > 0 ? (spent / planned) * 100 : spent > 0 ? 100 : 0;
  const [w, n, o] = thresholds || ws.settings.thresholds;
  let status: keyof typeof ENV_STATUS = "ok";
  if (pct > o) status = "over";
  else if (pct >= o) status = "full";
  else if (pct >= n) status = "near";
  else if (pct >= w) status = "warn";
  return {
    spent,
    planned,
    basePlanned,
    aidIn: aids.in,
    aidOut: aids.out,
    rest: planned - spent,
    pct,
    status,
    count: monthTx(ws, month).filter((t) => t.envId === env.id).length,
  };
}

/** Historique des retraits + transferts d’une enveloppe. */
export function envTxHistory(ws: WorkspaceSnapshot, month: string, env: Envelope) {
  const base = Number(env.planned) || 0;
  type Ev =
    | {
        kind: "tx";
        date: string;
        sort: string;
        id: string;
        amount: number;
        tx: WorkspaceSnapshot["transactions"][number];
      }
    | {
        kind: "aidIn" | "aidOut";
        date: string;
        sort: string;
        id: string;
        amount: number;
        aid: EnvelopeAid;
        fromName: string;
        toName: string;
      };

  const events: Ev[] = [];
  monthTx(ws, month)
    .filter((t) => t.envId === env.id)
    .forEach((t) =>
      events.push({
        kind: "tx",
        date: t.date,
        sort: t.date + "2" + t.id,
        id: t.id,
        amount: t.amount,
        tx: t,
      }),
    );
  monthAids(ws, month)
    .filter((a) => a.toEnvId === env.id || a.fromEnvId === env.id)
    .forEach((a) => {
      const inn = a.toEnvId === env.id;
      events.push({
        kind: inn ? "aidIn" : "aidOut",
        date: a.date,
        sort: a.date + "1" + a.id,
        id: a.id,
        amount: a.amount,
        aid: a,
        fromName: envNameById(ws, month, a.fromEnvId),
        toName: envNameById(ws, month, a.toEnvId),
      });
    });
  events.sort((a, b) => a.sort.localeCompare(b.sort));

  let capacity = base;
  let spent = 0;
  return events.map((ev) => {
    if (ev.kind === "aidIn") capacity += ev.amount;
    else if (ev.kind === "aidOut") capacity -= ev.amount;
    else spent += Number(ev.amount) || 0;
    return { ...ev, rest: capacity - spent, capacity, spent };
  });
}

export function catPlannedSum(
  b: { envelopes: unknown[] },
  cat: string,
  excludeId?: string,
) {
  return (b.envelopes as Envelope[])
    .filter((e) => e.cat === cat && e.id !== excludeId)
    .reduce((a, e) => a + (Number(e.planned) || 0), 0);
}

/** Reste à répartir dans les enveloppes d'une catégorie (plafond = répartition %). */
export function catRoomLeft(
  b: { incomes: unknown[]; pct: Record<string, number>; envelopes: unknown[] },
  cat: string,
  excludeId?: string,
) {
  return Math.max(0, catAlloc(b, cat) - catPlannedSum(b, cat, excludeId));
}

export function monthTotals(ws: WorkspaceSnapshot, month: string) {
  const b = ws.budgets[month];
  const cats = getCats(ws);
  const tx = monthTx(ws, month);
  const byCat: Record<string, number> = {};
  const alloc: Record<string, number> = {};
  cats.forEach((c) => {
    byCat[c.id] = tx.filter((t) => t.cat === c.id).reduce((a, t) => a + t.amount, 0);
    alloc[c.id] = b ? catAlloc(b, c.id) : 0;
  });
  const expenseCats = cats.filter((c) => c.kind === "expense");
  const transferCats = cats.filter((c) => c.kind === "transfer");
  const income = incomeTotal(b);
  const spent = expenseCats.reduce((a, c) => a + (byCat[c.id] || 0), 0);
  const saved = transferCats[0] ? byCat[transferCats[0].id] || 0 : 0;
  const invested = transferCats.slice(1).reduce((a, c) => a + (byCat[c.id] || 0), 0);
  return {
    b,
    income,
    spent,
    saved,
    invested,
    available: income - spent - saved - invested,
    byCat,
    alloc,
    txCount: tx.length,
    savingRate: income > 0 ? ((saved + invested) / income) * 100 : 0,
  };
}
