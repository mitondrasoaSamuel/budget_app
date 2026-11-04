"use client";

import { useMemo, useState } from "react";
import {
  catOf,
  ENV_STATUS,
  envNameById,
  envStats,
  envTxHistory,
  listAidSources,
  monthAids,
  suggestAidPlan,
} from "@/lib/budgetMath";
import { api } from "@/lib/client/api";
import { dateLabel, fmtPct, isoLocal, money } from "@/lib/utils";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { Input, MoneyInput } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";

export type EnvelopeRow = {
  id: string;
  cat: string;
  name: string;
  planned: number;
  share?: string;
  ownerId?: string | null;
  goalId?: string | null;
  carryIn?: number;
};

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const w = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 100));
  return (
    <div className="bar" role="presentation">
      <span style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

function defaultRetraitDate(month: string) {
  const today = isoLocal();
  return today.slice(0, 7) === month ? today : `${month}-01`;
}

export function RetraitSheet({
  workspace,
  month,
  env,
  onClose,
  onSaved,
  onOpenDetail,
  setWorkspace,
  setSaving,
  notify,
}: {
  workspace: WorkspaceSnapshot;
  month: string;
  env: EnvelopeRow;
  onClose: () => void;
  onSaved: (env: EnvelopeRow) => void;
  onOpenDetail: (env: EnvelopeRow) => void;
  setWorkspace: (ws: WorkspaceSnapshot) => void;
  setSaving: (v: boolean) => void;
  notify: (msg: string) => void;
}) {
  const live =
    ((workspace.budgets[month]?.envelopes || []) as EnvelopeRow[]).find((e) => e.id === env.id) ||
    env;
  const st = envStats(workspace, month, live);
  const available = Math.max(0, st.rest);
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(defaultRetraitDate(month));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"form" | "cover">("form");
  const [aidPick, setAidPick] = useState<Record<string, number>>({});

  const shortfall = Math.max(0, amount - available);
  const over = amount > available && amount > 0;
  const sources = useMemo(
    () => listAidSources(workspace, month, live),
    [workspace, month, live.id, live.cat, amount],
  );
  const surplus = sources.filter((x) => x.mode === "surplus");
  const emergency = sources.filter((x) => x.mode === "emergency");
  const aidTotal = Object.values(aidPick).reduce((a, v) => a + (Number(v) || 0), 0);
  const aidOk = aidTotal >= shortfall && shortfall > 0;
  const idea = suggestAidPlan(sources, shortfall);
  const ideaParts = Object.entries(idea.plan).map(
    ([id, amt]) => `${money(amt)} depuis ${envNameById(workspace, month, id)}`,
  );

  const buildAidsPayload = () =>
    Object.entries(aidPick)
      .map(([fromEnvId, amt]) => {
        const n = Number(amt) || 0;
        const src = sources.find((x) => x.env.id === fromEnvId);
        if (!src || n <= 0) return null;
        const take = Math.min(n, src.rest);
        if (take <= 0) return null;
        return { fromEnvId, amount: take, mode: src.mode };
      })
      .filter((x): x is { fromEnvId: string; amount: number; mode: "surplus" | "emergency" } => !!x);

  const saveRetrait = async (withAids: boolean, forceOver: boolean) => {
    setErr("");
    const b = workspace.budgets[month];
    if (!b?.started) {
      setErr("Commencez d’abord le budget du mois.");
      return;
    }
    if (b.closed) {
      setErr("Ce mois est clôturé.");
      return;
    }

    const aids = withAids ? buildAidsPayload() : [];
    const covered = aids.reduce((a, x) => a + x.amount, 0);
    if (withAids && !forceOver && covered < shortfall) {
      setErr(`Couvrez les ${money(shortfall)} manquants, ou déclarez un dépassement sans aide.`);
      return;
    }

    setBusy(true);
    setSaving(true);
    try {
      const planned = forceOver
        ? false
        : withAids && covered > 0
          ? true
          : amount <= available;
      const { workspace: next } = await api.createTransaction({
        month,
        date,
        amount,
        cat: live.cat,
        envId: live.id,
        desc: desc.trim() || "Retrait",
        planned,
        method: workspace.settings.methods[0] || "Espèces",
        scope:
          workspace.mode === "couple"
            ? live.share === "personal"
              ? "personal"
              : "common"
            : "personal",
        ownerId:
          live.share === "personal" ? live.ownerId || workspace.viewer : workspace.viewer,
        type: catOf(workspace, live.cat).kind,
        goalId: catOf(workspace, live.cat).kind === "transfer" ? live.goalId || null : null,
        aids: withAids && covered > 0 ? aids : undefined,
      });
      setWorkspace(next);
      if (covered > 0) {
        const fromNames = aids.map(
          (a) => `${money(a.amount)} de ${envNameById(workspace, month, a.fromEnvId)}`,
        );
        notify(`${money(covered)} transférés vers ${live.name} (${fromNames.join(", ")})`);
      } else if (forceOver || amount > available) {
        notify(
          `Retrait enregistré. ${live.name} dépasse le prévu de ${money(amount - available)}`,
        );
      } else {
        notify(`Retrait de ${money(amount)} — reste ${money(available - amount)} dans ${live.name}`);
      }
      onSaved(live);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Retrait impossible");
    } finally {
      setBusy(false);
      setSaving(false);
    }
  };

  const goCover = () => {
    setErr("");
    if (!(amount > 0)) {
      setErr("Indiquez un montant supérieur à zéro.");
      return;
    }
    if (!date || date.slice(0, 7) !== month) {
      setErr(`La date doit être dans le mois ${month}.`);
      return;
    }
    if (amount <= available) {
      void saveRetrait(false, false);
      return;
    }
    const { plan } = suggestAidPlan(sources, shortfall);
    setAidPick(plan);
    setStep("cover");
  };

  const setAidAmt = (id: string, v: number, max: number) =>
    setAidPick((p) => ({ ...p, [id]: Math.max(0, Math.min(max, Number(v) || 0)) }));

  const toggleAid = (src: (typeof sources)[number]) => {
    setAidPick((p) => {
      const cur = Number(p[src.env.id]) || 0;
      if (cur > 0) {
        const n = { ...p };
        delete n[src.env.id];
        return n;
      }
      const stillNeed = Math.max(
        0,
        shortfall -
          Object.entries(p).reduce(
            (a, [k, v]) => a + (k === src.env.id ? 0 : Number(v) || 0),
            0,
          ),
      );
      return { ...p, [src.env.id]: Math.min(src.rest, stillNeed || src.rest) };
    });
  };

  const renderSource = (src: (typeof sources)[number]) => {
    const val = Number(aidPick[src.env.id]) || 0;
    const on = val > 0;
    return (
      <div className="aid-row" key={src.env.id}>
        <input
          type="checkbox"
          checked={on}
          aria-label={`Utiliser ${src.env.name}`}
          onChange={() => toggleAid(src)}
        />
        <div>
          <div>{src.env.name}</div>
          <div className="aid-meta">
            {catOf(workspace, src.env.cat).name} · reste {money(src.rest)}
            {src.mode === "emergency" ? " · urgence" : ""}
          </div>
        </div>
        <MoneyInput
          value={val}
          onChange={(v) => setAidAmt(src.env.id, v, src.rest)}
        />
      </div>
    );
  };

  if (step === "cover") {
    return (
      <div className="sheet-root" role="dialog" aria-modal="true">
        <button type="button" className="sheet-backdrop" aria-label="Fermer" onClick={onClose} />
        <div className="sheet-panel sheet-wide">
          <div className="sheet-head">
            <h3>Budget insuffisant — {live.name}</h3>
            <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
              <AppIcon name="close" size={18} />
            </button>
          </div>
          <div className="sheet-body">
            <div className="alert-box" role="alert">
              <strong>Ce retrait dépasse le budget prévu</strong>
              <p>
                Vous voulez retirer {money(amount)}, mais il ne reste que {money(available)} dans{" "}
                {live.name}. Il manque <strong>{money(shortfall)}</strong>.
              </p>
            </div>

            {sources.length > 0 ? (
              <div className="idea-box">
                <strong>Idée pour équilibrer</strong>
                {idea.covered > 0 ? (
                  <p>
                    Prendre {ideaParts.join(", ")}
                    {idea.left > 0
                      ? `. Il resterait encore ${money(idea.left)} à couvrir.`
                      : " pour couvrir exactement le manque."}
                  </p>
                ) : (
                  <p>Aucune enveloppe n’a de reste utilisable pour le moment.</p>
                )}
                {idea.covered > 0 && (
                  <button
                    type="button"
                    className="link-btn"
                    style={{ marginTop: 6 }}
                    onClick={() => setAidPick(suggestAidPlan(sources, shortfall).plan)}
                  >
                    Appliquer cette idée
                  </button>
                )}
              </div>
            ) : (
              <div className="alert-box">
                <strong>Aucun reste disponible</strong>
                <p>Déclarez une urgence sans aide, ou réduisez le montant du retrait.</p>
              </div>
            )}

            {surplus.length > 0 && (
              <div className="aid-sec">
                <h4>Restes dans {catOf(workspace, live.cat).name}</h4>
                <p className="hint">
                  Argent encore libre dans la même catégorie : vous pouvez le réaffecter sans
                  toucher à l’épargne.
                </p>
                {surplus.map(renderSource)}
              </div>
            )}

            {emergency.length > 0 && (
              <div className="aid-sec">
                <h4>Déclarer une urgence</h4>
                <p className="hint">
                  Si les restes ne suffisent pas, prenez dans l’épargne, les loisirs ou un autre
                  budget. Chaque aide restera visible dans l’historique.
                </p>
                {emergency.map(renderSource)}
              </div>
            )}

            <div className={`aid-sum ${aidOk ? "ok" : "bad"}`}>
              <span>Transfert sélectionné</span>
              <span>
                {money(aidTotal)} / {money(shortfall)}
              </span>
            </div>
            {err && (
              <p className="error-text" role="alert" style={{ marginTop: 12 }}>
                {err}
              </p>
            )}
          </div>
          <div className="sheet-foot sheet-foot-split">
            <Button
              onClick={() => {
                setStep("form");
                setErr("");
              }}
              disabled={busy}
            >
              Retour
            </Button>
            <div className="sheet-foot-right">
              <Button
                className="danger"
                disabled={busy}
                onClick={() => void saveRetrait(false, true)}
              >
                Dépasser sans aide
              </Button>
              <Button
                variant="primary"
                disabled={busy || !aidOk}
                onClick={() => void saveRetrait(true, false)}
              >
                Retirer avec transfert
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-root" role="dialog" aria-modal="true">
      <button type="button" className="sheet-backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="sheet-panel">
        <div className="sheet-head">
          <h3>Retrait — {live.name}</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <AppIcon name="close" size={18} />
          </button>
        </div>
        <div className="sheet-body">
          <div className="retrait-rest">
            <span>Restant disponible</span>
            <strong className={st.rest < 0 ? "status over" : undefined}>
              <Money v={st.rest} />
            </strong>
          </div>
          <p className="hint" style={{ marginTop: -8, marginBottom: 8 }}>
            Prévu {money(st.basePlanned)}
            {st.aidIn ? ` · +${money(st.aidIn)} reçus` : ""}
            {st.aidOut ? ` · −${money(st.aidOut)} transférés` : ""} · déjà retiré {money(st.spent)}
          </p>
          <MoneyInput
            id="ret-amt"
            label="Montant à retirer"
            big
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setErr("");
            }}
          />
          {over && (
            <div className="alert-box" role="alert">
              <strong>Budget insuffisant</strong>
              <p>
                Ce montant dépasse le restant de {money(amount - available)}. Vous pourrez ensuite
                prendre une aide dans d’autres enveloppes.
              </p>
            </div>
          )}
          <Input
            id="ret-desc"
            label="Description (facultatif)"
            placeholder="Ex. paiement loyer, courses, essence"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <Input
            id="ret-date"
            label="Date du retrait"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            hint="La date du jour est proposée automatiquement."
          />
          {err && (
            <p className="error-text" role="alert">
              {err}
            </p>
          )}
        </div>
        <div className="sheet-foot sheet-foot-split">
          <Button variant="ghost" onClick={() => onOpenDetail(live)}>
            Voir le détail
          </Button>
          <div className="sheet-foot-right">
            <Button onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button variant="primary" disabled={busy} onClick={goCover}>
              {over ? "Continuer" : "Retirer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnvDetailSheet({
  workspace,
  month,
  env,
  onClose,
  onRetrait,
  onEdit,
  setWorkspace,
  setSaving,
  notify,
  readOnly,
}: {
  workspace: WorkspaceSnapshot;
  month: string;
  env: EnvelopeRow;
  onClose: () => void;
  onRetrait: (env: EnvelopeRow) => void;
  onEdit: (env: EnvelopeRow) => void;
  setWorkspace: (ws: WorkspaceSnapshot) => void;
  setSaving: (v: boolean) => void;
  notify: (msg: string) => void;
  readOnly?: boolean;
}) {
  const live =
    ((workspace.budgets[month]?.envelopes || []) as EnvelopeRow[]).find((e) => e.id === env.id) ||
    env;
  const st = envStats(workspace, month, live);
  const hist = useMemo(
    () => envTxHistory(workspace, month, live),
    [workspace, month, live.id, live.planned, workspace.settings.aids],
  );
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const status = ENV_STATUS[st.status];

  const removeTx = async (txId: string, amount: number) => {
    const hadAids = monthAids(workspace, month).some((a) => a.linkedTxId === txId);
    setSaving(true);
    try {
      const { workspace: next } = await api.deleteTransaction(txId);
      setWorkspace(next);
      setConfirmId(null);
      notify(hadAids ? "Dépense supprimée (transferts annulés)" : `Dépense de ${money(amount)} supprimée`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sheet-root" role="dialog" aria-modal="true">
      <button type="button" className="sheet-backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="sheet-panel">
        <div className="sheet-head">
          <h3>{live.name}</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <AppIcon name="close" size={18} />
          </button>
        </div>
        <div className="sheet-body">
          <div className="panel" style={{ marginBottom: 8 }}>
            <div className="goal-figs" style={{ marginBottom: 10 }}>
              <span>
                Prévu{" "}
                <strong>
                  <Money v={st.basePlanned} />
                </strong>
              </span>
              <span>
                Capacité{" "}
                <strong>
                  <Money v={st.planned} />
                </strong>
              </span>
              <span>
                Retiré{" "}
                <strong>
                  <Money v={st.spent} />
                </strong>
              </span>
              <span>
                Restant{" "}
                <strong className={st.rest < 0 ? "status over" : undefined}>
                  <Money v={st.rest} />
                </strong>
              </span>
            </div>
            <ProgressBar pct={st.pct} color={status.color} />
            <p className="hint" style={{ marginTop: 10 }}>
              {status.label}, {fmtPct(st.pct)} consommé.
              {live.carryIn ? ` Dont ${money(live.carryIn)} reportés du mois précédent.` : ""}
              {st.aidIn ? ` +${money(st.aidIn)} reçus.` : ""}
              {st.aidOut ? ` −${money(st.aidOut)} transférés.` : ""}
            </p>
          </div>

          {!readOnly && (
            <div className="env-detail-actions">
              <Button
                variant="primary"
                icon={<AppIcon name="minus" size={16} />}
                onClick={() => onRetrait(live)}
              >
                Faire un retrait
              </Button>
              <Button icon={<AppIcon name="settings" size={16} />} onClick={() => onEdit(live)}>
                Modifier
              </Button>
            </div>
          )}

          <div className="block-head" style={{ marginTop: 12, marginBottom: 4 }}>
            <h3 style={{ fontSize: 15 }}>Historique</h3>
          </div>
          {hist.length === 0 ? (
            <p className="muted">
              Aucun retrait ni aide pour le moment. Le restant reste égal au montant prévu (
              {money(st.basePlanned)}).
            </p>
          ) : (
            <div className="env-hist">
              <div className="env-hist-head has-del">
                <span>Mouvement</span>
                <span>Montant</span>
                <span>Reste après</span>
                <span />
              </div>
              {hist.map((ev) => {
                if (ev.kind === "aidIn" && ev.aid.linkedTxId) {
                  // Affiché sous le retrait lié
                  return null;
                }
                if (ev.kind === "tx") {
                  const aids = monthAids(workspace, month).filter((a) => a.linkedTxId === ev.tx.id);
                  return (
                    <div key={ev.id}>
                      <div className="env-hist-row has-del">
                        <div className="env-hist-main">
                          <div>
                            <div className="h-date">{dateLabel(ev.date)}</div>
                            <div className="h-desc">
                              Retrait
                              {ev.tx.desc && ev.tx.desc !== "Retrait" ? ` · ${ev.tx.desc}` : ""}
                              {aids.length ? " · couvert par transfert" : ""}
                            </div>
                          </div>
                          <div className="h-amt">
                            <Money v={ev.amount} />
                          </div>
                          <div className={`h-rest${ev.rest < 0 ? " over" : ""}`}>
                            <Money v={ev.rest} />
                          </div>
                        </div>
                        {!readOnly && (
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Supprimer cette dépense"
                            title="Supprimer"
                            onClick={() =>
                              setConfirmId(confirmId === ev.tx.id ? null : ev.tx.id)
                            }
                          >
                            <AppIcon name="trash" size={16} />
                          </button>
                        )}
                      </div>
                      {confirmId === ev.tx.id && (
                        <div className="notice bad" style={{ margin: "4px 0 10px" }}>
                          Supprimer cette dépense de {money(ev.tx.amount)} ?
                          {aids.length
                            ? ` Les ${aids.length} transfert${aids.length > 1 ? "s" : ""} lié${aids.length > 1 ? "s" : ""} seront aussi annulés.`
                            : ""}
                          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                            <Button
                              size="sm"
                              className="danger"
                              onClick={() => void removeTx(ev.tx.id, ev.tx.amount)}
                            >
                              Supprimer
                            </Button>
                            <Button size="sm" onClick={() => setConfirmId(null)}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      )}
                      {aids.map((a) => (
                        <div
                          className="env-hist-row aid-in has-del"
                          key={a.id}
                          style={{ paddingLeft: 12 }}
                        >
                          <div>
                            <div className="h-date">
                              Transfert depuis {envNameById(workspace, month, a.fromEnvId)}
                            </div>
                            <div className="h-desc">
                              {a.mode === "emergency" ? "Urgence" : "Reste"} · {money(a.amount)}{" "}
                              arrivés ici
                            </div>
                          </div>
                          <div className="h-amt">
                            +<Money v={a.amount} />
                          </div>
                          <div className="h-rest" />
                          <span />
                        </div>
                      ))}
                    </div>
                  );
                }
                const inn = ev.kind === "aidIn";
                return (
                  <div
                    className={`env-hist-row has-del ${inn ? "aid-in" : "aid-out"}`}
                    key={ev.id}
                  >
                    <div>
                      <div className="h-date">{dateLabel(ev.date)}</div>
                      <div className="h-desc">
                        {inn
                          ? `${money(ev.amount)} reçus de ${ev.fromName}`
                          : `${money(ev.amount)} transférés vers ${ev.toName}`}
                        {ev.aid.mode === "emergency" ? " · urgence" : ""}
                      </div>
                    </div>
                    <div className="h-amt">
                      {inn ? "+" : "−"}
                      <Money v={ev.amount} />
                    </div>
                    <div className={`h-rest${ev.rest < 0 ? " over" : ""}`}>
                      <Money v={ev.rest} />
                    </div>
                    <span />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="sheet-foot">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
