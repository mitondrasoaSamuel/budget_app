"use client";

import { getCats, monthTotals } from "@/lib/budgetMath";
import { fmtNum, fmtPct } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Money } from "@/components/ui/Money";

export default function AnalysesPage() {
  const { workspace, month } = useWorkspace();
  if (!workspace) return null;
  const t = monthTotals(workspace, month);
  const cats = getCats(workspace);

  return (
    <div className="page">
      <div className="page-head">
        <h2>Analyses</h2>
        <p>Prévu face au réel.</p>
      </div>
      <div className="kpis">
        {[
          ["Revenus", t.income],
          ["Dépenses", t.spent],
          ["Épargne", t.saved],
          ["Investissement", t.invested],
        ].map(([k, v]) => (
          <div className="kpi" key={String(k)}>
            <div className="k">{k}</div>
            <div className="v">
              <Money v={Number(v)} />
            </div>
          </div>
        ))}
        <div className="kpi">
          <div className="k">Taux d’épargne</div>
          <div className="v">{fmtPct(t.savingRate, 1)}</div>
        </div>
      </div>
      <section className="block">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Catégorie</th>
                <th className="r">Prévu</th>
                <th className="r">Réel</th>
                <th className="r">Écart</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => {
                const d = (t.byCat[c.id] || 0) - (t.alloc[c.id] || 0);
                return (
                  <tr key={c.id}>
                    <td>{c.short}</td>
                    <td className="r">{fmtNum(t.alloc[c.id] || 0)}</td>
                    <td className="r">{fmtNum(t.byCat[c.id] || 0)}</td>
                    <td className="r">
                      {d > 0 ? "+" : d < 0 ? "−" : ""}
                      {fmtNum(Math.abs(d))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
