import { catOf, envStats, getCats } from "@/lib/budgetMath";
import type { AppSettings, Category } from "@/lib/defaults";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import { shiftMonth } from "@/lib/utils";

export type CloseAction = "carry" | "wallet" | "drop";

export type CloseDecision = {
  envId: string;
  envName: string;
  cat: string;
  amount: number;
  action: CloseAction;
  walletId: string | null;
};

type Envelope = {
  id: string;
  cat: string;
  name: string;
  planned: number;
  carryIn?: number;
  share?: string;
  ownerId?: string | null;
  goalId?: string | null;
};

export function monthCloseItems(ws: WorkspaceSnapshot, month: string) {
  const b = ws.budgets[month];
  if (!b) return [] as { env: Envelope; rest: number; spent: number; planned: number }[];
  return (b.envelopes as Envelope[])
    .map((e) => {
      const st = envStats(ws, month, e);
      return { env: e, rest: Math.max(0, st.rest), spent: st.spent, planned: st.planned };
    })
    .filter((x) => x.rest > 0)
    .sort(
      (a, b2) =>
        a.env.cat.localeCompare(b2.env.cat) || a.env.name.localeCompare(b2.env.name, "fr"),
    );
}

export function defaultCloseAction(ws: WorkspaceSnapshot, cat: string): CloseAction {
  return catOf(ws, cat).kind === "transfer" ? "wallet" : "carry";
}

export function pickDefaultWallet(ws: WorkspaceSnapshot, cat: string) {
  const c = catOf(ws, cat);
  const prefer =
    c.id === "invest" || (c.kind === "transfer" && c.id !== "epargne")
      ? "invest"
      : c.id === "epargne" || c.kind === "transfer"
        ? "emergency"
        : "security";
  return ws.wallets.find((w) => w.kind === prefer)?.id || ws.wallets[0]?.id || "";
}

function norm(s: string) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function copyBudgetPayload(b: {
  incomes: unknown[];
  pct: Record<string, number>;
  envelopes: unknown[];
}) {
  const incomes = (b.incomes as { id: string; source: string; amount: number; memberId?: string }[]).map(
    (i) => ({ ...i, id: `inc-${uid()}` }),
  );
  const envelopes = (b.envelopes as Envelope[]).map((e) => ({
    ...e,
    id: `${e.cat}-${uid()}`,
    carryIn: 0,
  }));
  return {
    incomes,
    pct: { ...b.pct },
    envelopes,
    createdFrom: "copy",
  };
}

export function applyCarryDecisions(
  envelopes: Envelope[],
  decisions: CloseDecision[],
  cats: Category[],
) {
  const next = envelopes.map((e) => ({ ...e }));
  let total = 0;
  for (const d of decisions) {
    if (d.action !== "carry" || !(d.amount > 0)) continue;
    let env = next.find((e) => e.cat === d.cat && norm(e.name) === norm(d.envName));
    if (!env) {
      env = {
        id: `${d.cat}-${uid()}`,
        cat: d.cat,
        name: d.envName,
        planned: 0,
        share: "common",
        ownerId: null,
        goalId: null,
        carryIn: 0,
      };
      // keep category valid
      if (!cats.some((c) => c.id === env!.cat) && cats[0]) env.cat = cats[0].id;
      next.push(env);
    }
    env.planned = (Number(env.planned) || 0) + d.amount;
    env.carryIn = (Number(env.carryIn) || 0) + d.amount;
    total += d.amount;
  }
  return { envelopes: next, total };
}

export function getCloseDecisionsFromSettings(
  settings: AppSettings & { closeDecisionsByMonth?: Record<string, CloseDecision[]> },
  month: string,
): CloseDecision[] {
  return settings.closeDecisionsByMonth?.[month] || [];
}

export function findPrevClosedMonth(
  budgets: WorkspaceSnapshot["budgets"],
  month: string,
): string | null {
  const keys = Object.keys(budgets)
    .filter((k) => k < month && budgets[k]?.closed)
    .sort();
  return keys.length ? keys[keys.length - 1] : null;
}

/** Dernier mois avec un budget (fermé ou non), avant le mois courant. */
export function findPrevBudget(
  budgets: WorkspaceSnapshot["budgets"],
  month: string,
): string | null {
  const keys = Object.keys(budgets)
    .filter((k) => k < month)
    .sort();
  return keys.length ? keys[keys.length - 1] : null;
}

export function nextMonthKey(month: string) {
  return shiftMonth(month, 1);
}

export function catsForClose(ws: WorkspaceSnapshot, items: { env: Envelope }[]) {
  return getCats(ws).filter((c) => items.some(({ env }) => env.cat === c.id));
}
