"use client";

import { useEffect, useMemo, useState } from "react";
import {
  catAlloc,
  catPlannedSum,
  catRoomLeft,
  getCats,
  incomeTotal,
  monthTotals,
  pctTotal,
  envStats,
  ENV_STATUS,
} from "@/lib/budgetMath";
import { api } from "@/lib/client/api";
import {
  createBudgetNotifyMessage,
  createMonthBudget,
  type CreateBudgetMode,
} from "@/lib/client/ensureBudget";
import { exportBudgetPdf } from "@/lib/client/exportBudgetPdf";
import {
  catPctLeft,
  catPctSum,
  equalPctSplit,
  formatPct,
  isPctSplit,
  setEnvPct,
  syncPctEnvelopes,
  toAmountSplit,
  toPctSplit,
} from "@/lib/budget/envelopeSplit";
import { findPrevBudget, type CloseDecision } from "@/lib/closeMonth";
import type { Category } from "@/lib/defaults";
import { fmtPct, moisDe, money, monthLabel } from "@/lib/utils";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import { CloseMonthSheet } from "@/components/budget/CloseMonthSheet";
import { EnvDetailSheet, RetraitSheet } from "@/components/budget/EnvelopeSheets";
import { MonthWithdrawals } from "@/components/budget/MonthWithdrawals";
import { ResetBudgetChoice } from "@/components/budget/ResetBudgetChoice";
import { SplitModeToggle } from "@/components/budget/EnvelopeSplit";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { Input, MoneyInput, PctInput } from "@/components/ui/Input";

type Envelope = {
  id: string;
  cat: string;
  name: string;
  planned: number;
  sharePct?: number;
  share?: string;
  ownerId?: string | null;
  goalId?: string | null;
};

type IncomeRow = { id: string; source: string; amount: number; memberId?: string };

type EnvSheetState =
  | { mode: "create"; cat: string; maxPlanned: number }
  | { mode: "edit"; env: Envelope };

type BudgetMonth = {
  incomes: unknown[];
  pct: Record<string, number>;
  envelopes: unknown[];
};

const ENV_PAGE_SIZE = 6;
const openCatsStorageKey = (workspaceId: string) => `ariary:budget-env-open:${workspaceId}`;

function defaultOpenCats(cats: Category[]): Record<string, boolean> {
  // Première visite : seule la 1ʳᵉ catégorie (en haut) est ouverte
  return Object.fromEntries(cats.map((c, i) => [c.id, i === 0]));
}

function loadOpenCats(workspaceId: string, cats: Category[]): Record<string, boolean> {
  const fallback = defaultOpenCats(cats);
  try {
    const raw = sessionStorage.getItem(openCatsStorageKey(workspaceId));
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Record<string, boolean>;
    return Object.fromEntries(
      cats.map((c) => [c.id, typeof saved[c.id] === "boolean" ? saved[c.id] : false]),
    );
  } catch {
    return fallback;
  }
}

function persistOpenCats(workspaceId: string, map: Record<string, boolean>) {
  try {
    sessionStorage.setItem(openCatsStorageKey(workspaceId), JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

function newEnvelope(cat: string, name: string, planned = 0): Envelope {
  return {
    id: `${cat}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    cat,
    name,
    planned,
    share: "common",
    ownerId: null,
    goalId: null,
  };
}

function EnvelopeCategoryBlock({
  category,
  budget,
  envelopes,
  workspace,
  month,
  open,
  onToggleOpen,
  onSaveEnvelopes,
  onCreate,
  onEdit,
  onRetrait,
  onOpenDetail,
  onNotify,
  readOnly,
  canWithdraw,
}: {
  category: Category;
  budget: BudgetMonth;
  envelopes: Envelope[];
  workspace: WorkspaceSnapshot;
  month: string;
  open: boolean;
  onToggleOpen: () => void;
  onSaveEnvelopes: (next: Envelope[]) => void;
  onCreate: (cat: string, room: number) => void;
  onEdit: (env: Envelope) => void;
  onRetrait: (env: Envelope) => void;
  onOpenDetail: (env: Envelope) => void;
  onNotify: (msg: string) => void;
  readOnly?: boolean;
  canWithdraw?: boolean;
}) {
  const envs = useMemo(
    () => envelopes.filter((e) => e.cat === category.id),
    [envelopes, category.id],
  );
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const ceiling = catAlloc(budget, category.id);
  const planned = catPlannedSum(budget, category.id);
  const room = catRoomLeft(budget, category.id);
  const over = Math.max(0, planned - ceiling);
  const pctMode = isPctSplit(envelopes, category.id);
  const pctUsed = catPctSum(envelopes, category.id);
  const pctLeft = catPctLeft(envelopes, category.id);
  const saveSplit = (next: Envelope[]) =>
    onSaveEnvelopes(syncPctEnvelopes<Envelope>({ ...budget, envelopes: next }));
  const changeSplitMode = (toPct: boolean) =>
    saveSplit(
      toPct
        ? toPctSplit<Envelope>({ ...budget, envelopes }, category.id)
        : toAmountSplit(envelopes, category.id),
    );
  const pages = Math.max(1, Math.ceil(envs.length / ENV_PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const from = envs.length ? (safePage - 1) * ENV_PAGE_SIZE + 1 : 0;
  const to = Math.min(safePage * ENV_PAGE_SIZE, envs.length);
  const pageEnvs = showAll
    ? envs
    : envs.slice((safePage - 1) * ENV_PAGE_SIZE, safePage * ENV_PAGE_SIZE);
  const needsPager = envs.length > ENV_PAGE_SIZE;

  return (
    <div className={`cat-block${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="cat-head-toggle"
        aria-expanded={open}
        onClick={onToggleOpen}
      >
        <span className={`cat-chevron${open ? " open" : ""}`} aria-hidden>
          <AppIcon name="down" size={18} />
        </span>
        <span className="cat-head-main">
          <h4>
            <span className="swatch" style={{ background: category.color }} />
            {category.name}
          </h4>
          <span className="cat-head-meta muted">
            {envs.length} enveloppe{envs.length > 1 ? "s" : ""}
            {" · "}
            prévu <Money v={planned} />
          </span>
        </span>
      </button>

      {open && (
        <div className="cat-body">
          {!readOnly && envs.length > 0 && (
            <SplitModeToggle pctMode={pctMode} onChange={changeSplitMode} />
          )}
          <div className="cat-budget" aria-label={`Budget ${category.name}`}>
            <div>
              <span className="k">Budget catégorie</span>
              <span className="v">
                <Money v={ceiling} />
              </span>
            </div>
            <div>
              <span className="k">Déjà prévu</span>
              <span className="v">
                <Money v={planned} />
                {pctMode && <span className="muted"> · {formatPct(pctUsed)}</span>}
              </span>
            </div>
            <div>
              <span className="k">{over > 0 ? "Dépassement" : "Reste à répartir"}</span>
              <span className={`v${over > 0 ? " status over" : room === 0 ? "" : " ok"}`}>
                <Money v={over > 0 ? over : room} />
              </span>
            </div>
          </div>
          {pctMode ? (
            <div className="cat-budget-msg split-msg">
              <span className="muted">
                {pctLeft > 0
                  ? `Il reste ${formatPct(pctLeft)} (${money(room)}) à répartir.`
                  : "100 % réparti. Les montants suivent automatiquement le budget de la catégorie."}
              </span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => saveSplit(equalPctSplit(envelopes, category.id))}
                >
                  Parts égales
                </Button>
              )}
            </div>
          ) : over > 0 ? (
            <p className="cat-budget-msg error-text" role="alert">
              Plafond dépassé de {money(over)}. Réduisez une ou plusieurs enveloppes.
            </p>
          ) : room > 0 ? (
            <p className="cat-budget-msg muted">
              Il reste {money(room)} à répartir dans les enveloppes.
            </p>
          ) : ceiling === 0 ? (
            <p className="cat-budget-msg muted">
              Budget catégorie à 0 Ar (revenus ou %). Vous pouvez quand même ajouter des enveloppes à 0 Ar.
            </p>
          ) : (
            <p className="cat-budget-msg muted">
              Plafond atteint ({money(ceiling)}). Nouvelles enveloppes possibles à 0 Ar, ou réduisez une enveloppe existante.
            </p>
          )}
          {envs.length > 0 && (
            <div className="env-edit env-head">
              <span />
              <span className="c">{pctMode ? "Part" : "Prévu"}</span>
              <span className="c">Dépensé</span>
              <span className="c">Restant</span>
              <span />
            </div>
          )}
          {pageEnvs.map((e) => {
            const st = envStats(workspace, month, e);
            return (
              <div className="env-edit" key={e.id}>
                <div className="n">
                  <button
                    type="button"
                    className="env-name linkish"
                    onClick={() => onOpenDetail(e)}
                  >
                    {e.name}
                  </button>
                  <small>
                    {money(st.spent)} dépensés
                    {st.status !== "ok" && st.planned > 0 && (
                      <>
                        {", "}
                        <span className={`status ${st.status}`}>
                          {ENV_STATUS[st.status].label}
                        </span>
                      </>
                    )}
                  </small>
                </div>
                {pctMode ? (
                  <div className="env-pct">
                    {readOnly ? (
                      <strong>{formatPct(e.sharePct ?? 0)}</strong>
                    ) : (
                      <PctInput
                        value={e.sharePct ?? 0}
                        max={catPctLeft(envelopes, e.cat, e.id)}
                        onClamp={(raw, next) =>
                          onNotify(
                            `${formatPct(raw)} saisis → maximum ${formatPct(next)} pour « ${e.name} ».`,
                          )
                        }
                        onCommit={(v) => saveSplit(setEnvPct(envelopes, e.id, v))}
                      />
                    )}
                    <small>
                      <Money v={e.planned} />
                    </small>
                  </div>
                ) : readOnly ? (
                  <div className="c">
                    <Money v={e.planned} />
                  </div>
                ) : (
                  <MoneyInput
                    value={e.planned}
                    commitOnBlur
                    normalize={(v) => {
                      // catRoomLeft(..., e.id) = plafond − autres enveloppes (cette enveloppe exclue)
                      const max = catRoomLeft(budget, e.cat, e.id);
                      return Math.min(Math.max(0, v), max);
                    }}
                    onClamp={(raw, next) => {
                      const max = catRoomLeft(budget, e.cat, e.id);
                      if (max <= 0) {
                        onNotify(
                          "Aucun montant disponible : le plafond de la catégorie est déjà atteint. Réduisez une autre enveloppe.",
                        );
                      } else {
                        onNotify(
                          `${money(raw)} saisis → maximum ${money(max)} pour « ${e.name} » (${money(next)} appliqués).`,
                        );
                      }
                    }}
                    onChange={(plannedNext) => {
                      onSaveEnvelopes(
                        envelopes.map((x) => (x.id === e.id ? { ...x, planned: plannedNext } : x)),
                      );
                    }}
                  />
                )}
                <div className="c">
                  <Money v={st.spent} />
                </div>
                <div className={`c${st.rest < 0 ? " status over" : ""}`}>
                  <Money v={st.rest} />
                </div>
                <div className="env-acts">
                  {canWithdraw && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Retirer de ${e.name}`}
                      title="Faire un retrait"
                      onClick={() => onRetrait(e)}
                    >
                      <AppIcon name="minus" size={17} />
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Modifier ${e.name}`}
                      title="Modifier l’enveloppe"
                      onClick={() => onEdit(e)}
                    >
                      <AppIcon name="settings" size={17} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {needsPager && !showAll && (
            <div className="env-pager">
              <div className="env-pager-left">
                <span className="muted">
                  {from}–{to} sur {envs.length}
                </span>
                <button
                  type="button"
                  className="icon-btn env-expand-btn"
                  aria-label="Afficher toutes les enveloppes"
                  title="Tout afficher"
                  onClick={() => setShowAll(true)}
                >
                  <AppIcon name="down" size={18} />
                </button>
              </div>
              <div className="pagination-actions">
                <Button
                  size="sm"
                  aria-label="Page précédente"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  icon={<AppIcon name="left" size={16} />}
                />
                <span className="pagination-page">
                  {safePage} / {pages}
                </span>
                <Button
                  size="sm"
                  aria-label="Page suivante"
                  disabled={safePage >= pages}
                  onClick={() => setPage(safePage + 1)}
                  icon={<AppIcon name="right" size={16} />}
                />
              </div>
            </div>
          )}
          {needsPager && showAll && (
            <div className="env-collapse-bar">
              <div className="env-pager-left">
                <span className="muted">
                  1–{envs.length} sur {envs.length}
                </span>
                <button
                  type="button"
                  className="icon-btn env-expand-btn is-up"
                  aria-label="Revenir à la pagination"
                  title="Réduire la liste"
                  onClick={() => setShowAll(false)}
                >
                  <AppIcon name="down" size={18} />
                </button>
              </div>
            </div>
          )}
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="add-env-btn"
              icon={<AppIcon name="plus" size={16} />}
              onClick={() => onCreate(category.id, room)}
            >
              {room > 0 ? `Ajouter une enveloppe (${money(room)} disponibles)` : "Ajouter une enveloppe"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function BudgetPage() {
  const { workspace, month, setWorkspace, setMonth, setSaving, notify } = useWorkspace();
  const [sheet, setSheet] = useState<EnvSheetState | null>(null);
  const [retraitEnv, setRetraitEnv] = useState<Envelope | null>(null);
  const [detailEnv, setDetailEnv] = useState<Envelope | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPlanned, setDraftPlanned] = useState(0);
  const [draftPct, setDraftPct] = useState(0);
  const [confirmDel, setConfirmDel] = useState(false);
  const [sheetErr, setSheetErr] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean> | null>(null);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    setOpenCats(loadOpenCats(workspace.id, getCats(workspace)));
  }, [workspace?.id]);

  if (!workspace) return null;
  const b = workspace.budgets[month];
  const prevMonth = findPrevBudget(workspace.budgets, month);

  const createBudget = async (mode: CreateBudgetMode) => {
    if (creating) return;
    setCreating(true);
    setSaving(true);
    try {
      const { workspace: next, carried } = await createMonthBudget(workspace, month, mode);
      setWorkspace(next);
      notify(createBudgetNotifyMessage(carried, moisDe(month)));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Budget non créé");
    } finally {
      setCreating(false);
      setSaving(false);
    }
  };

  if (!b) {
    return (
      <div className="page">
        <div className="page-head">
          <h2>Budget {moisDe(month)}</h2>
          <p>Ce mois n’a pas encore de budget. Choisissez comment le préparer.</p>
        </div>
        <div className="choices">
          {prevMonth && (
            <button
              type="button"
              className="choice"
              disabled={creating}
              onClick={() => void createBudget("copy")}
            >
              <strong>Reprendre le budget {moisDe(prevMonth)}</strong>
              <span>Mêmes revenus, même répartition, mêmes enveloppes. Prêt en un clic.</span>
            </button>
          )}
          {prevMonth && (
            <button
              type="button"
              className="choice"
              disabled={creating}
              onClick={() => void createBudget("edit")}
            >
              <strong>Reprendre et modifier</strong>
              <span>
                Partir du budget {moisDe(prevMonth)} puis ajuster les montants qui changent.
              </span>
            </button>
          )}
          <button
            type="button"
            className="choice"
            disabled={creating}
            onClick={() => void createBudget("new")}
          >
            <strong>Créer un nouveau budget</strong>
            <span>Repartir de la répartition par défaut et saisir vos revenus.</span>
          </button>
        </div>
      </div>
    );
  }

  const cats = getCats(workspace);
  const incomes = b.incomes as IncomeRow[];
  const budgetForDisplay = b;
  const inc = incomeTotal(budgetForDisplay);
  const tot = pctTotal(b.pct, cats);
  const totals = monthTotals(workspace, month);
  const envelopes = b.envelopes as Envelope[];
  const openMap = openCats ?? defaultOpenCats(cats);

  const toggleCatOpen = (catId: string) => {
    setOpenCats((prev) => {
      const base = prev ?? defaultOpenCats(cats);
      const next = { ...base, [catId]: !base[catId] };
      persistOpenCats(workspace.id, next);
      return next;
    });
  };

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

  const startBudget = async () => {
    if (inc <= 0) {
      notify("Ajoutez au moins un revenu avant de commencer.");
      return;
    }
    if (tot !== 100) {
      notify("La répartition doit totaliser 100 % avant de commencer.");
      return;
    }
    setSaving(true);
    try {
      const { workspace: next } = await api.patchBudget({ month, started: true });
      setWorkspace(next);
      notify("Budget démarré — vous pouvez suivre vos dépenses.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const resetBudgetChoice = async () => {
    setSaving(true);
    try {
      const { workspace: next } = await api.deleteBudget(month);
      setWorkspace(next);
      notify("Vous pouvez choisir à nouveau comment préparer ce mois.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Retour aux choix impossible");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const done = await exportBudgetPdf(workspace, month);
      notify(done ? "PDF téléchargé" : "Aucun budget à exporter pour ce mois");
    } catch {
      notify("Génération du PDF impossible");
    } finally {
      setExporting(false);
    }
  };

  const confirmCloseMonth = async (payload: {
    decisions: CloseDecision[];
    prepareNext: boolean;
  }) => {
    setSaving(true);
    try {
      const res = await api.patchBudget({
        month,
        closed: true,
        closeDecisions: payload.decisions,
        prepareNext: payload.prepareNext,
      });
      setWorkspace(res.workspace);
      setCloseOpen(false);
      const carryTotal = payload.decisions
        .filter((d) => d.action === "carry")
        .reduce((a, d) => a + d.amount, 0);
      const walletTotal = payload.decisions
        .filter((d) => d.action === "wallet")
        .reduce((a, d) => a + d.amount, 0);
      notify(
        walletTotal > 0 && carryTotal > 0
          ? `Mois terminé : ${money(carryTotal)} reportés, ${money(walletTotal)} envoyés en portefeuille`
          : walletTotal > 0
            ? `Mois terminé : ${money(walletTotal)} envoyés en portefeuille`
            : carryTotal > 0
              ? `Mois terminé : ${money(carryTotal)} reportés au mois suivant`
              : "Mois terminé",
      );
      if (payload.prepareNext && res.nextMonth) {
        setMonth(res.nextMonth);
      }
    } catch (e) {
      throw e instanceof Error ? e : new Error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  const openCreate = (cat: string, room: number) => {
    setSheet({ mode: "create", cat, maxPlanned: room });
    setDraftName("");
    setDraftPlanned(0);
    setDraftPct(0);
    setConfirmDel(false);
    setSheetErr("");
  };

  const openEdit = (env: Envelope) => {
    setSheet({ mode: "edit", env });
    setDraftName(env.name);
    setDraftPlanned(env.planned);
    setDraftPct(env.sharePct ?? 0);
    setConfirmDel(false);
    setSheetErr("");
  };

  const closeSheet = () => {
    setSheet(null);
    setConfirmDel(false);
    setSheetErr("");
  };

  const submitSheet = async () => {
    if (!sheet) return;
    const name = draftName.trim();
    if (!name) {
      setSheetErr("Indiquez un nom d’enveloppe.");
      return;
    }

    if (sheetPctMode) {
      await save({ envelopes: pctSheetEnvelopes(name) });
      notify(sheet.mode === "create" ? "Enveloppe créée" : "Enveloppe mise à jour");
      closeSheet();
      return;
    }

    if (sheet.mode === "create") {
      const room = catRoomLeft(b, sheet.cat);
      // Autorisé même si room = 0 : enveloppe à 0 Ar (ajustable plus tard via revenus / %)
      const planned = Math.min(Math.max(0, draftPlanned), Math.max(0, room));
      await save({ envelopes: [...envelopes, newEnvelope(sheet.cat, name, planned)] });
      notify("Enveloppe créée");
    } else {
      const max = catRoomLeft(b, sheet.env.cat, sheet.env.id);
      const planned = Math.min(Math.max(0, draftPlanned), max);
      if (planned !== draftPlanned) {
        setSheetErr(
          max <= 0
            ? "Aucun montant disponible : réduisez une autre enveloppe."
            : `Maximum ${money(max)} pour cette enveloppe.`,
        );
        setDraftPlanned(planned);
        return;
      }
      await save({
        envelopes: envelopes.map((e) =>
          e.id === sheet.env.id ? { ...e, name, planned } : e
        ),
      });
      notify("Enveloppe mise à jour");
    }
    closeSheet();
  };

  const removeEnvelope = async () => {
    if (!sheet || sheet.mode !== "edit") return;
    await save({ envelopes: envelopes.filter((e) => e.id !== sheet.env.id) });
    notify("Enveloppe supprimée");
    closeSheet();
  };

  const sheetMax =
    sheet?.mode === "create"
      ? sheet.maxPlanned
      : sheet
        ? catRoomLeft(b, sheet.env.cat, sheet.env.id)
        : 0;

  const sheetPctMode =
    sheet?.mode === "create"
      ? isPctSplit(envelopes, sheet.cat)
      : typeof sheet?.env.sharePct === "number";

  const sheetPctMax =
    sheet?.mode === "create"
      ? catPctLeft(envelopes, sheet.cat)
      : sheet
        ? catPctLeft(envelopes, sheet.env.cat, sheet.env.id)
        : 0;

  function pctSheetEnvelopes(name: string): Envelope[] {
    const sharePct = Math.min(Math.max(0, draftPct), sheetPctMax);
    if (sheet?.mode === "create") {
      return [...envelopes, { ...newEnvelope(sheet.cat, name), sharePct }];
    }
    return envelopes.map((e) => (e.id === sheet?.env.id ? { ...e, name, sharePct } : e));
  }

  const isDraft = !b.started;
  const isClosed = b.closed;

  return (
    <div className="page">
      <div className="page-head-row">
        <div className="page-head">
          <h2>
            Budget {monthLabel(month)}
            {isClosed ? " · clôturé" : ""}
          </h2>
          <p>
            {isClosed
              ? "Ce mois est terminé. Les reports et transferts ont été enregistrés."
              : "Les modifications sont enregistrées automatiquement."}
          </p>
        </div>
        <div className="page-head-actions">
          {isDraft && !isClosed && <ResetBudgetChoice onConfirm={resetBudgetChoice} />}
          <Button
            icon={<AppIcon name="download" size={17} />}
            disabled={exporting}
            onClick={() => void downloadPdf()}
          >
            {exporting ? "Génération du PDF…" : "Télécharger en PDF"}
          </Button>
          {isDraft && !isClosed && (
            <Button variant="primary" onClick={() => void startBudget()}>
              Commencer
            </Button>
          )}
          {!isDraft && !isClosed && (
            <Button
              variant="primary"
              icon={<AppIcon name="check" size={17} />}
              onClick={() => setCloseOpen(true)}
            >
              Terminer le mois
            </Button>
          )}
        </div>
      </div>

      {b.createdFrom === "edit" && !isClosed && (
        <div className="notice">
          Budget repris du mois précédent. Vérifiez vos revenus et ajustez les enveloppes qui
          changent ce mois-ci.{" "}
          <button
            type="button"
            className="link-btn"
            onClick={() => void save({ createdFrom: "copy" })}
          >
            C’est fait
          </button>
        </div>
      )}

      <div
        className={`budget-phase${isClosed ? " is-closed" : isDraft ? " is-draft" : " is-active"}`}
        role="status"
      >
        {isClosed ? (
          <>
            <strong>Mois clôturé</strong>
            <span>Ce budget n’accepte plus de nouvelles opérations.</span>
          </>
        ) : isDraft ? (
          <>
            <strong>Prévision</strong>
            <span>
              Préparez revenus, répartition et enveloppes. Cliquez sur{" "}
              <em>Commencer</em> pour activer le suivi des dépenses.
            </span>
          </>
        ) : (
          <>
            <strong>Budget en cours</strong>
            <span>Le mois est démarré : les dépenses s’imputent sur les enveloppes.</span>
          </>
        )}
      </div>

      <section className="block">
        <div className="block-head">
          <h3>Revenus</h3>
          <p>Tout ce qui entre ce mois-ci.</p>
        </div>
        {incomes.map((i, idx) => (
          <div className="inc-row solo" key={i.id}>
            <select
              className="input"
              value={i.source}
              disabled={isClosed}
              onChange={(e) => {
                const next = [...incomes];
                next[idx] = { ...i, source: e.target.value };
                void save({ incomes: next });
              }}
            >
              {["Salaire", "Freelance", "Business", "Commission", "Prime", "Autre", "Chiffre d’affaires"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <MoneyInput
              value={i.amount}
              commitOnBlur
              onChange={(v) => {
                if (isClosed) return;
                const next = [...incomes];
                next[idx] = { ...i, amount: v };
                void save({ incomes: next });
              }}
            />
            {!isClosed && (
              <button
                type="button"
                className="icon-btn"
                aria-label="Supprimer"
                onClick={() => void save({ incomes: incomes.filter((x) => x.id !== i.id) })}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {!isClosed && (
          <div className="inc-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void save({
                  incomes: [
                    ...incomes,
                    { id: `inc-${Date.now()}`, source: "Salaire", amount: 0, memberId: "m1" },
                  ],
                })
              }
            >
              Ajouter un revenu
            </Button>
          </div>
        )}
        <div className="inc-total">
          <span>Total des revenus</span>
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
                disabled={isClosed}
                onChange={(e) => void save({ pct: { ...b.pct, [c.id]: Number(e.target.value) } })}
              />
            </div>
            <PctInput
              className="pct-input"
              ariaLabel={`Part de ${c.name}`}
              value={Number(b.pct[c.id]) || 0}
              disabled={isClosed}
              onCommit={(v) => void save({ pct: { ...b.pct, [c.id]: v } })}
            />
            <div className="amount">
              <Money v={catAlloc(budgetForDisplay, c.id)} />
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
        {cats.map((c) => (
          <EnvelopeCategoryBlock
            key={c.id}
            category={c}
            budget={budgetForDisplay}
            envelopes={envelopes}
            workspace={workspace}
            month={month}
            open={!!openMap[c.id]}
            onToggleOpen={() => toggleCatOpen(c.id)}
            onSaveEnvelopes={(next) => void save({ envelopes: next })}
            onCreate={openCreate}
            onEdit={openEdit}
            onRetrait={(e) => {
              setDetailEnv(null);
              setRetraitEnv(e);
            }}
            onOpenDetail={(e) => {
              setRetraitEnv(null);
              setDetailEnv(e);
            }}
            onNotify={notify}
            readOnly={isClosed}
            canWithdraw={!isDraft && !isClosed}
          />
        ))}
      </section>

      {!isDraft && (
        <MonthWithdrawals
          workspace={workspace}
          month={month}
          envelopes={envelopes}
          onOpenEnvelope={(e) => {
            setRetraitEnv(null);
            setDetailEnv(e);
          }}
        />
      )}

      {sheet && (
        <div className="sheet-root" role="dialog" aria-modal="true">
          <button type="button" className="sheet-backdrop" aria-label="Fermer" onClick={closeSheet} />
          <div className="sheet-panel">
            <div className="sheet-head">
              <h3>{sheet.mode === "edit" ? sheet.env.name : "Nouvelle enveloppe"}</h3>
              <button type="button" className="icon-btn" aria-label="Fermer" onClick={closeSheet}>
                <AppIcon name="close" size={18} />
              </button>
            </div>
            <div className="sheet-body">
              <Input
                id="env-name"
                label="Nom"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Ex. Alimentation"
              />
              {sheetPctMode ? (
                <PctInput
                  id="env-pct"
                  label={`Part du budget catégorie (max ${formatPct(sheetPctMax)})`}
                  value={draftPct}
                  max={sheetPctMax}
                  onCommit={setDraftPct}
                />
              ) : (
                <MoneyInput
                  id="env-planned"
                  label={`Montant prévu (max ${money(sheetMax)})`}
                  value={draftPlanned}
                  onChange={(v) => setDraftPlanned(Math.min(Math.max(0, v), sheetMax))}
                />
              )}
              {sheetErr && <p className="error-text">{sheetErr}</p>}
              {sheet.mode === "edit" && (
                <div className="sheet-danger">
                  {!confirmDel ? (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDel(true)}>
                      Supprimer cette enveloppe
                    </Button>
                  ) : (
                    <div className="sheet-danger-confirm">
                      <p className="muted">Confirmer la suppression ?</p>
                      <Button variant="ghost" size="sm" onClick={() => void removeEnvelope()}>
                        Oui, supprimer
                      </Button>
                      <Button size="sm" onClick={() => setConfirmDel(false)}>
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={`sheet-foot${sheet.mode === "edit" ? " sheet-foot-split" : ""}`}>
              {sheet.mode === "edit" ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const env = sheet.env;
                      closeSheet();
                      setDetailEnv(env);
                    }}
                  >
                    Voir le détail
                  </Button>
                  <div className="sheet-foot-right">
                    <Button onClick={closeSheet}>Fermer</Button>
                    <Button variant="primary" onClick={() => void submitSheet()}>
                      Enregistrer
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button onClick={closeSheet}>Fermer</Button>
                  <Button variant="primary" onClick={() => void submitSheet()}>
                    Créer
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {closeOpen && (
        <CloseMonthSheet
          workspace={workspace}
          month={month}
          onClose={() => setCloseOpen(false)}
          onConfirm={confirmCloseMonth}
        />
      )}

      {retraitEnv && (
        <RetraitSheet
          workspace={workspace}
          month={month}
          env={retraitEnv}
          onClose={() => setRetraitEnv(null)}
          onSaved={(env) => {
            setRetraitEnv(null);
            setDetailEnv(env);
          }}
          onOpenDetail={(env) => {
            setRetraitEnv(null);
            setDetailEnv(env);
          }}
          setWorkspace={setWorkspace}
          setSaving={setSaving}
          notify={notify}
        />
      )}

      {detailEnv && (
        <EnvDetailSheet
          workspace={workspace}
          month={month}
          env={detailEnv}
          onClose={() => setDetailEnv(null)}
          onRetrait={(env) => {
            setDetailEnv(null);
            setRetraitEnv(env);
          }}
          onEdit={(env) => {
            setDetailEnv(null);
            openEdit(env);
          }}
          setWorkspace={setWorkspace}
          setSaving={setSaving}
          notify={notify}
          readOnly={isClosed}
        />
      )}
    </div>
  );
}
