"use client";

import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Money } from "@/components/ui/Money";
import { fmtPct, money } from "@/lib/utils";

export default function ObjectifsPage() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;

  return (
    <div className="page">
      <div className="page-head">
        <h2>Objectifs</h2>
        <p>Épargne et projets de votre espace.</p>
      </div>
      <div className="goals">
        {workspace.goals.map((g) => {
          const pct = g.target > 0 ? (g.initial / g.target) * 100 : 0;
          return (
            <div className="panel goal-card" key={g.id}>
              <strong>{g.name}</strong>
              <div className="goal-figs">
                <span>
                  Atteint <strong><Money v={g.initial} /></strong>
                </span>
                <span>Objectif {money(g.target)}</span>
              </div>
              <div className="bar">
                <span style={{ width: `${Math.min(100, pct)}%`, background: "var(--accent)" }} />
              </div>
              <p className="hint">{fmtPct(pct)} atteint · {g.kind}</p>
            </div>
          );
        })}
        {!workspace.goals.length && <p className="muted">Aucun objectif.</p>}
      </div>
    </div>
  );
}
