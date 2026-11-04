"use client";

import { useMemo, useState } from "react";
import {
  catsForClose,
  defaultCloseAction,
  monthCloseItems,
  pickDefaultWallet,
  type CloseAction,
  type CloseDecision,
} from "@/lib/closeMonth";
import { catOf } from "@/lib/budgetMath";
import { monthLabel } from "@/lib/utils";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";

type Choice = { action: CloseAction; walletId: string; amount: number };

export function CloseMonthSheet({
  workspace,
  month,
  onClose,
  onConfirm,
}: {
  workspace: WorkspaceSnapshot;
  month: string;
  onClose: () => void;
  onConfirm: (payload: {
    decisions: CloseDecision[];
    prepareNext: boolean;
  }) => Promise<void>;
}) {
  const b = workspace.budgets[month];
  const items = useMemo(() => monthCloseItems(workspace, month), [workspace, month]);

  const [choices, setChoices] = useState<Record<string, Choice>>(() => {
    const o: Record<string, Choice> = {};
    items.forEach(({ env, rest }) => {
      o[env.id] = {
        action: defaultCloseAction(workspace, env.cat),
        walletId: pickDefaultWallet(workspace, env.cat),
        amount: rest,
      };
    });
    return o;
  });
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map(({ env }) => [env.id, false])),
  );
  const [bulkAction, setBulkAction] = useState<CloseAction>("carry");
  const [bulkWallet, setBulkWallet] = useState(workspace.wallets[0]?.id || "");
  const [prepareNext, setPrepareNext] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (!b) {
    return (
      <div className="sheet-root" role="dialog" aria-modal="true">
        <button type="button" className="sheet-backdrop" aria-label="Fermer" onClick={onClose} />
        <div className="sheet-panel sheet-lg">
          <div className="sheet-head">
            <h3>Terminer le mois</h3>
            <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
              <AppIcon name="close" size={18} />
            </button>
          </div>
          <div className="sheet-body">
            <p className="muted">Aucun budget.</p>
          </div>
        </div>
      </div>
    );
  }

  if (b.closed) {
    return (
      <div className="sheet-root" role="dialog" aria-modal="true">
        <button type="button" className="sheet-backdrop" aria-label="Fermer" onClick={onClose} />
        <div className="sheet-panel sheet-lg">
          <div className="sheet-head">
            <h3>Terminer le mois</h3>
            <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
              <AppIcon name="close" size={18} />
            </button>
          </div>
          <div className="sheet-body">
            <p className="muted">Ce mois est déjà clôturé.</p>
          </div>
          <div className="sheet-foot">
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </div>
      </div>
    );
  }

  const setChoice = (id: string, patch: Partial<Choice>) =>
    setChoices((c) => ({ ...c, [id]: { ...c[id], ...patch } }));

  const selectedIds = items.filter(({ env }) => selected[env.id]).map(({ env }) => env.id);
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0;

  const toggleAll = (on: boolean) =>
    setSelected(Object.fromEntries(items.map(({ env }) => [env.id, on])));

  const applyBulk = (ids: string[], action: CloseAction, walletId: string) => {
    if (!ids.length) return;
    setChoices((c) => {
      const next = { ...c };
      ids.forEach((id) => {
        const item = items.find((x) => x.env.id === id);
        next[id] = {
          ...next[id],
          action,
          walletId:
            action === "wallet"
              ? walletId || pickDefaultWallet(workspace, item?.env.cat || "")
              : next[id].walletId,
        };
      });
      return next;
    });
  };

  const applyToAll = (action: CloseAction) =>
    applyBulk(
      items.map(({ env }) => env.id),
      action,
      bulkWallet,
    );

  const applyToSelected = () => {
    if (!someSelected) {
      setErr("Cochez d’abord une ou plusieurs enveloppes.");
      return;
    }
    setErr("");
    applyBulk(selectedIds, bulkAction, bulkWallet);
  };

  const applyByCat = (cat: string, action: CloseAction) => {
    const ids = items.filter(({ env }) => env.cat === cat).map(({ env }) => env.id);
    applyBulk(ids, action, bulkWallet);
  };

  const carryTotal = items.reduce(
    (a, { env }) => a + (choices[env.id]?.action === "carry" ? choices[env.id].amount : 0),
    0,
  );
  const walletTotal = items.reduce(
    (a, { env }) => a + (choices[env.id]?.action === "wallet" ? choices[env.id].amount : 0),
    0,
  );
  const dropTotal = items.reduce(
    (a, { env }) => a + (choices[env.id]?.action === "drop" ? choices[env.id].amount : 0),
    0,
  );

  const catsPresent = catsForClose(workspace, items);

  const submit = async () => {
    setErr("");
    for (const { env } of items) {
      const c = choices[env.id];
      if (c.action === "wallet" && !c.walletId) {
        setErr(`Choisissez un portefeuille pour ${env.name}.`);
        return;
      }
    }
    const decisions: CloseDecision[] = items.map(({ env, rest }) => {
      const c = choices[env.id];
      return {
        envId: env.id,
        envName: env.name,
        cat: env.cat,
        amount: rest,
        action: c.action,
        walletId: c.action === "wallet" ? c.walletId : null,
      };
    });
    setBusy(true);
    try {
      await onConfirm({ decisions, prepareNext });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Clôture impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet-root" role="dialog" aria-modal="true">
      <button type="button" className="sheet-backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="sheet-panel sheet-lg">
        <div className="sheet-head">
          <h3>Terminer {monthLabel(month)}</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <AppIcon name="close" size={18} />
          </button>
        </div>
        <div className="sheet-body">
          <p className="muted" style={{ marginBottom: 14 }}>
            Utilisez les actions rapides pour tout traiter d’un coup, ou cochez plusieurs enveloppes
            puis appliquez. Vous pouvez encore ajuster ligne par ligne ensuite.
          </p>

          {items.length === 0 ? (
            <div className="idea-box">
              <strong>Aucun reste à traiter</strong>
              <p>Toutes les enveloppes sont à zéro ou en dépassement. Vous pouvez tout de même clôturer le mois.</p>
            </div>
          ) : (
            <div>
              <div className="bulk-bar">
                <span className="bulk-label">Actions rapides</span>
                <Button size="sm" onClick={() => applyToAll("carry")}>
                  Tout laisser ici
                </Button>
                <Button size="sm" onClick={() => applyToAll("wallet")}>
                  Tout envoyer en portefeuille
                </Button>
                <Button size="sm" onClick={() => applyToAll("drop")}>
                  Rien reporter
                </Button>
              </div>

              <div className="bulk-bar">
                <span className="bulk-label">
                  {someSelected
                    ? `${selectedIds.length} sélectionnée${selectedIds.length > 1 ? "s" : ""}`
                    : "Sélection"}
                </span>
                <select
                  className="input"
                  aria-label="Action pour la sélection"
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value as CloseAction)}
                >
                  <option value="carry">Laisser ici (reporter)</option>
                  <option value="wallet">Envoyer en portefeuille</option>
                  <option value="drop">Ne pas reporter</option>
                </select>
                {bulkAction === "wallet" && (
                  <select
                    className="input"
                    aria-label="Portefeuille pour la sélection"
                    value={bulkWallet}
                    onChange={(e) => setBulkWallet(e.target.value)}
                  >
                    {workspace.wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!someSelected}
                  onClick={applyToSelected}
                >
                  Appliquer à la sélection
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleAll(!allSelected)}>
                  {allSelected ? "Tout décocher" : "Tout cocher"}
                </Button>
              </div>

              {catsPresent.length > 1 && (
                <div className="bulk-bar">
                  <span className="bulk-label">Par catégorie</span>
                  {catsPresent.map((c) => (
                    <div key={c.id} className="bulk-cat-row">
                      <span className="bulk-cat-name">{c.short}</span>
                      <Button size="sm" onClick={() => applyByCat(c.id, "carry")}>
                        Reporter
                      </Button>
                      <Button size="sm" onClick={() => applyByCat(c.id, "wallet")}>
                        Portefeuille
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="table-wrap">
                <table className="close-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          aria-label="Tout sélectionner"
                          onChange={(e) => toggleAll(e.target.checked)}
                        />
                      </th>
                      <th>Enveloppe</th>
                      <th>Catégorie</th>
                      <th className="r">Reste</th>
                      <th>Destination</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ env, rest }) => {
                      const c = choices[env.id];
                      return (
                        <tr key={env.id} className={selected[env.id] ? "selected" : undefined}>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!selected[env.id]}
                              aria-label={`Sélectionner ${env.name}`}
                              onChange={() =>
                                setSelected((x) => ({ ...x, [env.id]: !x[env.id] }))
                              }
                            />
                          </td>
                          <td>
                            <strong>{env.name}</strong>
                          </td>
                          <td className="muted">{catOf(workspace, env.cat).short}</td>
                          <td className="r">
                            <Money v={rest} />
                          </td>
                          <td>
                            <div className="dest">
                              <select
                                className="input"
                                aria-label={`Destination ${env.name}`}
                                value={c.action}
                                onChange={(e) =>
                                  setChoice(env.id, { action: e.target.value as CloseAction })
                                }
                              >
                                <option value="carry">Laisser ici (reporter)</option>
                                <option value="wallet">Envoyer en portefeuille</option>
                                <option value="drop">Ne pas reporter</option>
                              </select>
                              {c.action === "wallet" && (
                                <select
                                  className="input"
                                  aria-label={`Portefeuille ${env.name}`}
                                  value={c.walletId}
                                  onChange={(e) => setChoice(env.id, { walletId: e.target.value })}
                                >
                                  {workspace.wallets.map((w) => (
                                    <option key={w.id} value={w.id}>
                                      {w.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="close-sum">
            <span>
              Reportés :{" "}
              <strong>
                <Money v={carryTotal} />
              </strong>
            </span>
            <span>
              Portefeuilles :{" "}
              <strong>
                <Money v={walletTotal} />
              </strong>
            </span>
            {dropTotal > 0 && (
              <span className="muted">
                Non reportés : <Money v={dropTotal} />
              </span>
            )}
          </div>

          <div className="field" style={{ marginTop: 18 }}>
            <label className="close-prepare">
              <input
                type="checkbox"
                checked={prepareNext}
                onChange={(e) => setPrepareNext(e.target.checked)}
              />
              <span>Aller au mois suivant après la clôture</span>
            </label>
            <span className="hint">
              Vous choisirez alors de reprendre ce budget, de le modifier, ou d’en créer un nouveau. Les
              reports s’appliqueront au moment de la création.
            </span>
          </div>
          {err && (
            <p className="error-text" role="alert">
              {err}
            </p>
          )}
        </div>
        <div className="sheet-foot">
          <Button onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            icon={<AppIcon name="check" size={16} />}
            onClick={() => void submit()}
          >
            Confirmer la clôture
          </Button>
        </div>
      </div>
    </div>
  );
}
