"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import { goalWallet } from "@/lib/wallets";
import { GoalCard } from "@/components/goals/GoalCard";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { Input, MoneyInput } from "@/components/ui/Input";

const KIND_OPTIONS = [
  { id: "saving", label: "Épargne" },
  { id: "project", label: "Projet" },
  { id: "invest", label: "Investissement" },
] as const;

type GoalKind = (typeof KIND_OPTIONS)[number]["id"];

function kindLabel(kind: string) {
  return KIND_OPTIONS.find((k) => k.id === kind)?.label || kind;
}

type Draft = {
  name: string;
  kind: GoalKind;
  target: number;
  initial: number;
  deadline: string;
  walletId: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  kind: "saving",
  target: 0,
  initial: 0,
  deadline: "",
  walletId: "",
});

export default function ObjectifsPage() {
  const { workspace, setWorkspace, setSaving, notify } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState("");

  if (!workspace) return null;

  const openCreate = () => {
    setEditId(null);
    setDraft(emptyDraft());
    setConfirmDel(false);
    setErr("");
    setOpen(true);
  };

  const openEdit = (g: (typeof workspace.goals)[number]) => {
    setEditId(g.id);
    setDraft({
      name: g.name,
      kind: (KIND_OPTIONS.some((k) => k.id === g.kind) ? g.kind : "saving") as GoalKind,
      target: g.target,
      initial: g.initial,
      deadline: g.deadline || "",
      walletId: goalWallet(workspace, g.id)?.id || "",
    });
    setConfirmDel(false);
    setErr("");
    setOpen(true);
  };

  const closeForm = () => {
    setOpen(false);
    setEditId(null);
    setConfirmDel(false);
    setErr("");
    setDraft(emptyDraft());
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setErr("Indiquez un nom d’objectif.");
      return;
    }
    if (draft.target < 0 || draft.initial < 0) {
      setErr("Montants invalides.");
      return;
    }

    setSaving(true);
    setErr("");
    try {
      const body = {
        name,
        kind: draft.kind,
        target: Math.round(draft.target),
        initial: Math.round(draft.initial),
        deadline: draft.deadline.trim(),
        walletId: draft.walletId || null,
      };
      const { workspace: next } = editId
        ? await api.patchGoal({ id: editId, ...body })
        : await api.createGoal(body);
      setWorkspace(next);
      notify(editId ? "Objectif mis à jour" : "Objectif créé");
      closeForm();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const { workspace: next } = await api.deleteGoal(editId);
      setWorkspace(next);
      notify("Objectif supprimé");
      closeForm();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head-row">
        <div className="page-head">
          <h2>Objectifs</h2>
          <p>Épargne et projets de votre espace.</p>
        </div>
        <Button variant="primary" onClick={() => (open && !editId ? closeForm() : openCreate())}>
          {open && !editId ? "Fermer" : "Nouvel objectif"}
        </Button>
      </div>

      {open && (
        <section className="block panel">
          <form onSubmit={(e) => void submit(e)}>
            <h3>{editId ? "Modifier l’objectif" : "Nouvel objectif"}</h3>
            <Input
              id="goal-name"
              label="Nom"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Ex. Voyage, Voiture, Fonds d’urgence"
            />
            <div className="field">
              <label htmlFor="goal-kind">Type</label>
              <select
                id="goal-kind"
                className="input"
                value={draft.kind}
                onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as GoalKind }))}
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="row">
              <MoneyInput
                id="goal-target"
                label="Montant objectif"
                value={draft.target}
                onChange={(v) => setDraft((d) => ({ ...d, target: v }))}
              />
              <MoneyInput
                id="goal-initial"
                label={draft.walletId ? "Montant de départ (hors portefeuille)" : "Déjà atteint"}
                value={draft.initial}
                onChange={(v) => setDraft((d) => ({ ...d, initial: v }))}
              />
            </div>
            <div className="field">
              <label htmlFor="goal-wallet">Portefeuille lié</label>
              <select
                id="goal-wallet"
                className="input"
                value={draft.walletId}
                onChange={(e) => setDraft((d) => ({ ...d, walletId: e.target.value }))}
              >
                <option value="">Aucun (suivi manuel)</option>
                {workspace.wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <small className="hint">
                Le solde du portefeuille s’ajoute automatiquement à la progression de l’objectif.
              </small>
            </div>
            <Input
              id="goal-deadline"
              label="Échéance (optionnel)"
              type="date"
              value={draft.deadline}
              onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))}
            />
            {err && (
              <p className="error-text" role="alert">
                {err}
              </p>
            )}
            {editId && (
              <div className="sheet-danger">
                {!confirmDel ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDel(true)}>
                    Supprimer cet objectif
                  </Button>
                ) : (
                  <div className="sheet-danger-confirm">
                    <p className="muted">Confirmer la suppression ?</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void remove()}>
                      Oui, supprimer
                    </Button>
                    <Button type="button" size="sm" onClick={() => setConfirmDel(false)}>
                      Annuler
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div className="inc-actions">
              <Button type="button" onClick={closeForm}>
                Annuler
              </Button>
              <Button type="submit" variant="primary">
                {editId ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </section>
      )}

      <div className="goals">
        {workspace.goals.map((g) => (
          <GoalCard
            key={g.id}
            workspace={workspace}
            goal={g}
            kindLabel={kindLabel(g.kind)}
            onEdit={() => openEdit(g)}
          />
        ))}
        {!workspace.goals.length && <p className="muted">Aucun objectif. Créez-en un pour suivre votre épargne.</p>}
      </div>
    </div>
  );
}
