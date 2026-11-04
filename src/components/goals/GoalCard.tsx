"use client";

import { fmtPct, money } from "@/lib/utils";
import { goalProgress } from "@/lib/wallets";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import { AppIcon } from "@/components/ui/AppIcon";
import { Money } from "@/components/ui/Money";

type Goal = WorkspaceSnapshot["goals"][number];

export function GoalCard({
  workspace,
  goal,
  kindLabel,
  onEdit,
}: {
  workspace: WorkspaceSnapshot;
  goal: Goal;
  kindLabel: string;
  onEdit: () => void;
}) {
  const p = goalProgress(workspace, goal);
  return (
    <div className={`panel goal-card${p.reached ? " is-reached" : ""}`}>
      <div className="goal-card-head">
        <strong>{goal.name}</strong>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Modifier ${goal.name}`}
          title="Modifier"
          onClick={onEdit}
        >
          <AppIcon name="settings" size={17} />
        </button>
      </div>
      {p.reached && (
        <span className="goal-badge" role="status">
          <AppIcon name="check" size={14} />
          Objectif atteint
        </span>
      )}
      <div className="goal-figs">
        <span>
          Atteint{" "}
          <strong>
            <Money v={p.saved} />
          </strong>
        </span>
        <span>Objectif {money(goal.target)}</span>
      </div>
      <div className="bar">
        <span style={{ width: `${Math.min(100, p.pct)}%`, background: "var(--accent)" }} />
      </div>
      <p className="hint">
        {fmtPct(p.pct)} atteint · {kindLabel}
        {goal.deadline ? ` · échéance ${goal.deadline}` : ""}
      </p>
      <p className="hint">
        {p.wallet ? `Portefeuille : ${p.wallet.name}` : "Suivi manuel (aucun portefeuille lié)"}
        {!p.reached && goal.target > 0 ? ` · il manque ${money(p.missing)}` : ""}
      </p>
    </div>
  );
}
