"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { catOf, getCats, monthTotals, envStats } from "@/lib/budgetMath";
import { money } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { ensureMonthBudget } from "@/lib/client/ensureBudget";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const { workspace, month, setWorkspace, setSaving, notify } = useWorkspace();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!workspace) return;
      if (!workspace.budgets[month]) {
        setSaving(true);
        try {
          const next = await ensureMonthBudget(workspace, month);
          if (alive) setWorkspace(next);
        } catch (e) {
          if (alive) notify(e instanceof Error ? e.message : "Budget non créé");
        } finally {
          if (alive) setSaving(false);
        }
      }
      await new Promise((r) => setTimeout(r, 180));
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [workspace, month, setWorkspace, setSaving, notify]);

  const totals = useMemo(() => (workspace ? monthTotals(workspace, month) : null), [workspace, month]);
  const cats = workspace ? getCats(workspace) : [];

  if (!workspace || !ready || !totals) return <DashboardSkeleton />;

  const watch =
    totals.b?.envelopes
      ?.map((e) => {
        const env = e as { id: string; cat: string; name: string; planned: number };
        return { e: env, st: envStats(workspace, month, env) };
      })
      .filter((x) => x.st.planned > 0 || x.st.spent > 0)
      .sort((a, b) => b.st.pct - a.st.pct)
      .slice(0, 6) || [];

  return (
    <div className="page">
      <div className="hero">
        <div>
          <h2>Bonjour {workspace.displayName}</h2>
          <p className="lead">
            Sur {money(totals.income)} de revenus, {money(totals.spent)} en dépenses, {money(totals.saved)} vers l’épargne et{" "}
            {money(totals.invested)} vers vos projets.
          </p>
          <div className="hero-actions">
            <Button variant="primary" onClick={() => router.push("/app/depenses")}>
              Ajouter une dépense
            </Button>
            <Button onClick={() => router.push("/app/budget")}>Voir le budget</Button>
          </div>
        </div>
        <div className="ledger panel">
          <div className="ledger-row">
            <span className="l">Revenus</span>
            <Money v={totals.income} />
          </div>
          <div className="ledger-row">
            <span className="l">Dépenses</span>
            <Money v={-totals.spent} />
          </div>
          <div className="ledger-row">
            <span className="l">Épargne</span>
            <Money v={-totals.saved} />
          </div>
          <div className="ledger-row total">
            <span className="l">Disponible</span>
            <Money v={totals.available} />
          </div>
        </div>
      </div>

      <section className="block">
        <div className="block-head">
          <h3>Répartition</h3>
        </div>
        <div className="alloc-legend">
          {cats.map((c) => (
            <div className="legend-item" key={c.id}>
              <div className="name">
                <span className="swatch" style={{ background: c.color }} />
                {c.name}
              </div>
              <div className="fig">
                <strong>
                  <Money v={totals.byCat[c.id] || 0} />
                </strong>{" "}
                / {money(totals.alloc[c.id] || 0)} · {catOf(workspace, c.id).kind}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <h3>Enveloppes à surveiller</h3>
        </div>
        <div className="env-list">
          {watch.map(({ e, st }) => (
            <div className="env-row static" key={e.id}>
              <div className="top">
                <span className="name">{e.name}</span>
                <span className={`status ${st.status}`}>{Math.round(st.pct)} %</span>
              </div>
              <div className="right">
                <Money v={st.rest} />
              </div>
              <div className="meta">
                {money(st.spent)} sur {money(st.planned)}
              </div>
              <div />
              <div className="bar">
                <span style={{ width: `${Math.min(100, st.pct)}%`, background: "var(--accent)" }} />
              </div>
            </div>
          ))}
          {!watch.length && <p className="muted">Aucune enveloppe active.</p>}
        </div>
      </section>
    </div>
  );
}
