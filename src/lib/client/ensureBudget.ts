import { api } from "@/lib/client/api";
import { defaultEnvelopes } from "@/lib/defaults";
import type { WorkspaceSnapshot } from "@/lib/workspace";

const inflight = new Map<string, Promise<WorkspaceSnapshot>>();

/** Crée le budget du mois s’il manque, en dédoublonnant les appels concurrents. */
export function ensureMonthBudget(workspace: WorkspaceSnapshot, month: string) {
  if (workspace.budgets[month]) return Promise.resolve(workspace);

  const key = `${workspace.id}:${month}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = api
    .patchBudget({
      month,
      incomes: [],
      pct: workspace.settings.defaultPct,
      envelopes: defaultEnvelopes(0, workspace.settings.defaultPct, workspace.settings.categories),
    })
    .then((res) => res.workspace)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
