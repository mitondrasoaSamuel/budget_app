"use client";

import {
  depositsOf,
  goalProgress,
  goalsOfWallet,
  sumDeposits,
  type WalletDeposit,
} from "@/lib/wallets";
import { fmtPct, monthLabel } from "@/lib/utils";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import { Money } from "@/components/ui/Money";

type Wallet = WorkspaceSnapshot["wallets"][number];

function WalletGoals({ workspace, walletId }: { workspace: WorkspaceSnapshot; walletId: string }) {
  return goalsOfWallet(workspace, walletId).map((g) => {
    const p = goalProgress(workspace, g);
    return (
      <span key={g.id} className={`hint${p.reached ? " goal-reached-text" : ""}`}>
        Objectif {g.name} : {p.reached ? "atteint ✓" : fmtPct(p.pct)}
      </span>
    );
  });
}

function WalletCard({
  workspace,
  wallet,
  deposits,
  selected,
  onSelect,
}: {
  workspace: WorkspaceSnapshot;
  wallet: Wallet;
  deposits: WalletDeposit[];
  selected: boolean;
  onSelect: () => void;
}) {
  const last = deposits[0];
  return (
    <button
      type="button"
      className={`panel wallet-card${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="wallet-name">{wallet.name}</span>
      <strong className="wallet-balance">
        <Money v={wallet.balance} />
      </strong>
      <span className="hint">
        {deposits.length
          ? `${deposits.length} versement${deposits.length > 1 ? "s" : ""} · `
          : "Aucun versement"}
        {deposits.length > 0 && <Money v={sumDeposits(deposits)} />}
      </span>
      {last && <span className="hint">Dernier : {monthLabel(last.month)}</span>}
      <WalletGoals workspace={workspace} walletId={wallet.id} />
    </button>
  );
}

export function WalletCards({
  workspace,
  deposits,
  selectedId,
  onSelect,
}: {
  workspace: WorkspaceSnapshot;
  deposits: WalletDeposit[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (!workspace.wallets.length) return <p className="muted">Aucun portefeuille.</p>;
  return (
    <div className="goals">
      {workspace.wallets.map((w) => (
        <WalletCard
          key={w.id}
          workspace={workspace}
          wallet={w}
          deposits={depositsOf(deposits, w.id)}
          selected={selectedId === w.id}
          onSelect={() => onSelect(selectedId === w.id ? null : w.id)}
        />
      ))}
    </div>
  );
}
