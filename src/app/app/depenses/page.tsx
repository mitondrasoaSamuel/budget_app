"use client";

import { useMemo, useState, type FormEvent } from "react";
import { catOf, getCats, monthTotals } from "@/lib/budgetMath";
import { api } from "@/lib/client/api";
import { isoLocal, money, monthLabel, paginate } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { Input, MoneyInput } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";
import { Pagination } from "@/components/ui/Pagination";
import { Seg } from "@/components/ui/Seg";

export default function DepensesPage() {
  const { workspace, month, setWorkspace, setSaving, notify } = useWorkspace();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState("");
  const [formCat, setFormCat] = useState("");
  const [envId, setEnvId] = useState("");

  if (!workspace) return null;
  const cats = getCats(workspace);
  const activeCat = formCat || cats[0]?.id || "";
  const b = workspace.budgets[month];
  const envs = ((b?.envelopes || []) as { id: string; cat: string; name: string }[]).filter((e) => e.cat === activeCat);
  const totals = monthTotals(workspace, month);
  const pageSize = workspace.settings.pageSize || 10;

  const filtered = useMemo(() => {
    let list = [...workspace.transactions].filter((t) => t.month === month);
    if (cat !== "all") list = list.filter((t) => t.cat === cat);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter((t) => t.desc.toLowerCase().includes(n));
    }
    return list.sort((a, b2) => (b2.date + b2.id).localeCompare(a.date + a.id));
  }, [workspace.transactions, month, cat, q]);

  const paged = paginate(filtered, page, pageSize);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!(amount > 0)) return notify("Montant invalide");
    const chosen = envId || envs[0]?.id;
    if (!chosen) return notify("Aucune enveloppe dans cette catégorie");
    setSaving(true);
    try {
      const { workspace: next } = await api.createTransaction({
        month,
        date: isoLocal(),
        amount,
        cat: activeCat,
        envId: chosen,
        desc: desc.trim() || "Dépense",
        planned: true,
        method: workspace.settings.methods[0] || "Espèces",
        scope: workspace.mode === "personal" ? "personal" : "common",
        ownerId: workspace.viewer,
        type: catOf(workspace, activeCat).kind,
      });
      setWorkspace(next);
      setAmount(0);
      setDesc("");
      setOpen(false);
      setPage(1);
      notify("Opération enregistrée");
    } catch (ex) {
      notify(ex instanceof Error ? ex.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head-row">
        <div className="page-head">
          <h2>Dépenses</h2>
          <p>
            {totals.txCount} opérations en {monthLabel(month)} : {money(totals.spent)} de dépenses.
          </p>
        </div>
        <Button variant="primary" onClick={() => setOpen((v) => !v)}>
          {open ? "Fermer" : "Nouvelle opération"}
        </Button>
      </div>

      {open && (
        <section className="block panel">
          <form onSubmit={submit}>
            <MoneyInput label="Montant" value={amount} onChange={setAmount} />
            <Input label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <div className="row">
              <div className="field">
                <label htmlFor="cat">Catégorie</label>
                <select
                  id="cat"
                  className="input"
                  value={activeCat}
                  onChange={(e) => {
                    setFormCat(e.target.value);
                    setEnvId("");
                  }}
                >
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="env">Enveloppe</label>
                <select id="env" className="input" value={envId || envs[0]?.id || ""} onChange={(e) => setEnvId(e.target.value)}>
                  {envs.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button variant="primary" type="submit">
              Enregistrer
            </Button>
          </form>
        </section>
      )}

      <div className="filters">
        <input className="input search" placeholder="Rechercher" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }}>
          <option value="all">Toutes</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Seg
          label="Page"
          value={String(pageSize) as "5" | "10" | "20"}
          onChange={(v) => {
            void (async () => {
              setSaving(true);
              try {
                const { workspace: next } = await api.patchWorkspace({
                  settings: { ...workspace.settings, pageSize: Number(v) },
                });
                setWorkspace(next);
                setPage(1);
              } finally {
                setSaving(false);
              }
            })();
          }}
          options={[
            ["5", "5"],
            ["10", "10"],
            ["20", "20"],
          ]}
        />
      </div>

      <section className="block">
        {!paged.items.length ? (
          <p className="muted">Aucune opération.</p>
        ) : (
          <div className="tx-list">
            {paged.items.map((tx) => {
              const envName = ((b?.envelopes || []) as { id: string; name: string }[]).find((e) => e.id === tx.envId)?.name || "—";
              const c = catOf(workspace, tx.cat);
              return (
                <div className="tx-row" key={tx.id}>
                  <div>
                    <div className="tx-desc">{tx.desc}</div>
                    <div className="tx-meta muted">
                      {tx.date} · {c.short} · {envName}
                    </div>
                  </div>
                  <div className={`tx-amt${c.kind === "transfer" ? " transfer" : ""}`}>
                    <Money v={-tx.amount} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination {...paged} onChange={setPage} />
      </section>
    </div>
  );
}
