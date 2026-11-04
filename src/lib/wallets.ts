import type { WorkspaceSnapshot } from "@/lib/workspace";

export type WalletDeposit = {
  id: string;
  month: string;
  walletId: string;
  envName: string;
  cat: string;
  amount: number;
};

/** Versements reçus par les portefeuilles lors des clôtures de mois (plus récents d’abord). */
export function walletDeposits(ws: WorkspaceSnapshot): WalletDeposit[] {
  const byMonth = ws.settings.closeDecisionsByMonth || {};
  return Object.entries(byMonth)
    .flatMap(([month, decisions]) =>
      decisions
        .filter((d) => d.action === "wallet" && d.walletId && d.amount > 0)
        .map((d) => ({
          id: `${month}-${d.envId}`,
          month,
          walletId: d.walletId as string,
          envName: d.envName,
          cat: d.cat,
          amount: d.amount,
        })),
    )
    .sort((a, b) => b.month.localeCompare(a.month) || b.amount - a.amount);
}

export function depositsOf(deposits: WalletDeposit[], walletId: string) {
  return deposits.filter((d) => d.walletId === walletId);
}

export function sumDeposits(deposits: WalletDeposit[]) {
  return deposits.reduce((a, d) => a + d.amount, 0);
}

type Goal = WorkspaceSnapshot["goals"][number];

export function goalWallet(ws: WorkspaceSnapshot, goalId: string) {
  const walletId = ws.settings.goalWallets?.[goalId];
  return ws.wallets.find((w) => w.id === walletId) || null;
}

/** Progression d’un objectif : montant de départ + solde du portefeuille lié. */
export function goalProgress(ws: WorkspaceSnapshot, goal: Goal) {
  const wallet = goalWallet(ws, goal.id);
  const saved = goal.initial + (wallet?.balance || 0);
  const pct = goal.target > 0 ? (saved / goal.target) * 100 : 0;
  return {
    wallet,
    saved,
    pct,
    missing: Math.max(0, goal.target - saved),
    reached: goal.target > 0 && saved >= goal.target,
  };
}

export function goalsOfWallet(ws: WorkspaceSnapshot, walletId: string) {
  return ws.goals.filter((g) => ws.settings.goalWallets?.[g.id] === walletId);
}
