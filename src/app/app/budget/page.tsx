"use client";

import { useEffect } from "react";
import { catAlloc, getCats, incomeTotal, monthTotals, pctTotal, envStats } from "@/lib/budgetMath";
import { api } from "@/lib/client/api";
import { ensureMonthBudget } from "@/lib/client/ensureBudget";
import { fmtPct, money } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { MoneyInput } from "@/components/ui/Input";

export default function BudgetPage() {
  const { workspace, month, setWorkspace, setSaving, notify } = useWorkspace();

  useEffect(() => {
    if (!workspace || workspace.budgets[month]) return;
    let alive = true;
    void (async () => {
      setSaving(true);
      try {
        const next = await ensureMonthBudget(workspace, month);
        if (alive) setWorkspace(next);
      } catch (e) {
        if (alive) notify(e instanceof Error ? e.message : "Budget non créé");
      } finally {
        if (alive) setSaving(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [workspace, month, setWorkspace, setSaving, notify]);

  if (!workspace) return null;
  const b = workspace.budgets[month];
  if (!b) return <p className="muted">Chargement du budget…</p>;

  const cats = getCats(workspace);
  const inc = incomeTotal(b);
  const tot = pctTotal(b.pct, cats);
  const totals = monthTotals(workspace, month);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { workspace: next } = await api.patchBudget({ month, ...patch });
      setWorkspace(next);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Budget</h2>
        <p>
          Revenus {money(inc)} · taux d’épargne {fmtPct(totals.savingRate, 1)}
        </p>
      </div>

      <section className="block">
        <div className="block-head">
          <h3>Revenus</h3>
        </div>
        {(b.incomes as { id: string; source: string; amount: number }[]).map((i, idx) => (
          <div className="inc-row solo" key={i.id}>
            <select
              className="input"
              value={i.source}
              onChange={(e) => {
                const incomes = [...(b.incomes as { id: string; source: string; amount: number }[])];
                incomes[idx] = { ...i, source: e.target.value };
                void save({ incomes });
              }}
            >
              {["Salaire", "Freelance", "Business", "Commission", "Prime", "Autre", "Chiffre d’affaires"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <MoneyInput
              value={i.amount}
              onChange={(v) => {
                const incomes = [...(b.incomes as { id: string; source: string; amount: number }[])];
                incomes[idx] = { ...i, amount: v };
                void save({ incomes });
              }}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label="Supprimer"
              onClick={() => {
                const incomes = (b.incomes as { id: string }[]).filter((x) => x.id !== i.id);
                void save({ incomes });
              }}
            >
              ×
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            void save({
              incomes: [
                ...(b.incomes as unknown[]),
                { id: `inc-${Date.now()}`, source: "Salaire", amount: 0, memberId: "m1" },
              ],
            })
          }
        >
          Ajouter un revenu
        </Button>
        <div className="inc-total">
          <span>Total</span>
          <Money v={inc} />
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <h3>Répartition</h3>
        </div>
        {cats.map((c) => (
          <div className="pct-row" key={c.id}>
            <div className="cname">
              <span className="swatch" style={{ background: c.color }} />
              {c.name}
            </div>
            <div className="range">
              <input
                type="range"
                min={0}
                max={100}
                value={b.pct[c.id] || 0}
                onChange={(e) => void save({ pct: { ...b.pct, [c.id]: Number(e.target.value) } })}
              />
            </div>
            <div className="input-suffix">
              <input
                className="input pct-input"
                type="number"
                value={b.pct[c.id] || 0}
                onChange={(e) => void save({ pct: { ...b.pct, [c.id]: Number(e.target.value) || 0 } })}
              />
              <span>%</span>
            </div>
            <div className="amount">
              <Money v={catAlloc(b, c.id)} />
            </div>
          </div>
        ))}
        <div className={`sum-line${tot !== 100 ? " bad" : ""}`}>
          <strong>Total {fmtPct(tot)}</strong>
          {tot !== 100 && <span className="error-text">Doit faire 100 %.</span>}
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <h3>Enveloppes</h3>
        </div>
        {cats.map((c) => {
          const envs = (b.envelopes as { id: string; cat: string; name: string; planned: number }[]).filter((e) => e.cat === c.id);
          return (
            <div className="cat-block" key={c.id}>
              <div className="cat-head">
                <h4>
                  <span className="swatch" style={{ background: c.color }} />
                  {c.name}
                </h4>
              </div>
              {envs.map((e) => {
                const st = envStats(workspace, month, e);
                return (
                  <div className="env-edit" key={e.id}>
                    <div className="n">
                      <span className="env-name">{e.name}</span>
                      <small>
                        {money(st.spent)} dépensés
                      </small>
                    </div>
                    <MoneyInput
                      value={e.planned}
                      onChange={(v) => {
                        const envelopes = (b.envelopes as { id: string; planned: number }[]).map((x) =>
                          x.id === e.id ? { ...x, planned: v } : x
                        );
                        void save({ envelopes });
                      }}
                    />
                    <div className="c">
                      <Money v={st.spent} />
                    </div>
                    <div className="c">
                      <Money v={st.rest} />
                    </div>
                    <div />
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>
    </div>
  );
}
