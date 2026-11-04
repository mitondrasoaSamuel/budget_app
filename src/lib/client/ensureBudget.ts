import { api } from "@/lib/client/api";
import {
  applyCarryDecisions,
  copyBudgetPayload,
  findPrevBudget,
  findPrevClosedMonth,
  getCloseDecisionsFromSettings,
} from "@/lib/closeMonth";
import { defaultEnvelopes } from "@/lib/defaults";
import { money } from "@/lib/utils";
import type { WorkspaceSnapshot } from "@/lib/workspace";

export type CreateBudgetMode = "copy" | "edit" | "new";

type CreateResult = { workspace: WorkspaceSnapshot; carried: number };

const inflight = new Map<string, Promise<CreateResult>>();

function applyPendingCarries(
  workspace: WorkspaceSnapshot,
  month: string,
  envelopes: unknown[],
) {
  const prevClosed = findPrevClosedMonth(workspace.budgets, month);
  if (!prevClosed) return { envelopes, carried: 0 };
  if (workspace.settings.carriesApplied?.[month] === prevClosed) {
    return { envelopes, carried: 0 };
  }
  const decisions = getCloseDecisionsFromSettings(workspace.settings, prevClosed);
  if (!decisions.length) return { envelopes, carried: 0 };
  const result = applyCarryDecisions(
    envelopes as Parameters<typeof applyCarryDecisions>[0],
    decisions,
    workspace.settings.categories,
  );
  return { envelopes: result.envelopes, carried: result.total };
}

/**
 * Crée le budget du mois selon le choix utilisateur (comme le HTML).
 * - copy / edit : reprend le mois précédent
 * - new : répartition par défaut, revenus vides
 */
export async function createMonthBudget(
  workspace: WorkspaceSnapshot,
  month: string,
  mode: CreateBudgetMode,
): Promise<CreateResult> {
  if (workspace.budgets[month]) {
    return { workspace, carried: 0 };
  }

  const key = `${workspace.id}:${month}:${mode}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async (): Promise<CreateResult> => {
    const prev = findPrevBudget(workspace.budgets, month);
    const prevBudget = prev ? workspace.budgets[prev] : null;

    let incomes: unknown[] = [];
    let pct = workspace.settings.defaultPct;
    let envelopes: unknown[] = defaultEnvelopes(0, pct, workspace.settings.categories);
    let createdFrom: CreateBudgetMode = "new";

    if ((mode === "copy" || mode === "edit") && prevBudget) {
      const copied = copyBudgetPayload(prevBudget);
      incomes = copied.incomes;
      pct = copied.pct;
      envelopes = copied.envelopes;
      createdFrom = mode;
    }

    const withCarries = applyPendingCarries(workspace, month, envelopes);
    envelopes = withCarries.envelopes;

    const { workspace: next } = await api.patchBudget({
      month,
      incomes,
      pct,
      envelopes,
      createdFrom,
    });
    return { workspace: next, carried: withCarries.carried };
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

/**
 * Crée le budget du mois s’il manque (dashboard / appels legacy).
 * Préfère une copie du mois précédent s’il existe, sinon budget neuf.
 */
export function ensureMonthBudget(workspace: WorkspaceSnapshot, month: string) {
  if (workspace.budgets[month]) return Promise.resolve(workspace);
  const prev = findPrevBudget(workspace.budgets, month);
  const mode: CreateBudgetMode = prev ? "copy" : "new";
  return createMonthBudget(workspace, month, mode).then((r) => r.workspace);
}

export function createBudgetNotifyMessage(carried: number, monthLabelFr: string) {
  return carried > 0
    ? `Budget créé avec ${money(carried)} reportés du mois précédent`
    : `Budget ${monthLabelFr} créé`;
}
