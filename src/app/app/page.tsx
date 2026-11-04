"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { catOf, getCats, monthTotals, envStats } from "@/lib/budgetMath";
import { money, moisDe } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const { workspace, month } = useWorkspace();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!workspace) return;
      await new Promise((r) => setTimeout(r, 180));
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [workspace, month]);

  const hasBudget = !!workspace?.budgets[month];
  const totals = useMemo(
    () => (workspace && hasBudget ? monthTotals(workspace, month) : null),
    [workspace, month, hasBudget],
  );
  const cats = workspace ? getCats(workspace) : [];

  if (!workspace || !ready) return <DashboardSkeleton />;

  if (!hasBudget || !totals) {
    return (
      <div className="page">
        <div className="page-head">
          <h2>Bonjour {workspace.displayName}</h2>
          <p>Aucun budget pour {moisDe(month)} pour l’instant.</p>
        </div>
        <div className="empty">
          <strong>Préparez d’abord le budget du mois</strong>
          <p>Choisissez de reprendre le mois précédent ou de créer un nouveau budget.</p>
          <div>
            <Button variant="primary" onClick={() => router.push("/app/budget")}>
              Aller au budget
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <button
              type="button"
              className="env-row"
              key={e.id}
              onClick={() => router.push("/app/budget")}
            >
              <div className="top">
                <span className="name">{e.name}</span>
              </div>
              <div className="right">
                <Money v={st.rest} /> <span className="faint">restant</span>
              </div>
              <div className="meta">
                {money(st.spent)} sur {money(st.planned)}
              </div>
              <div />
              <div className="bar">
                <span
                  style={{
                    width: `${Math.min(100, st.pct)}%`,
                    background: st.status === "over" ? "var(--over)" : "var(--accent)",
                  }}
                />
              </div>
            </button>
          ))}
          {!watch.length && <p className="muted">Aucune enveloppe à surveiller pour l’instant.</p>}
        </div>
      </section>
    </div>
  );
}
