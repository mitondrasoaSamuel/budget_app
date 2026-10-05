import type { AppSettings, Category } from "./defaults";
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

export function envStats(ws: WorkspaceSnapshot, month: string, env: Envelope, thresholds?: AppSettings["thresholds"]) {
  const spent = monthTx(ws, month)
    .filter((t) => t.envId === env.id)
    .reduce((a, t) => a + t.amount, 0);
  const planned = Number(env.planned) || 0;
  const pct = planned > 0 ? (spent / planned) * 100 : spent > 0 ? 100 : 0;
  const [w, n, o] = thresholds || ws.settings.thresholds;
  let status: "ok" | "warn" | "near" | "over" = "ok";
  if (pct > o) status = "over";
  else if (pct >= n) status = "near";
  else if (pct >= w) status = "warn";
  return { spent, planned, rest: planned - spent, pct, status };
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
