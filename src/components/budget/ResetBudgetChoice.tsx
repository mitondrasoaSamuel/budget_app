"use client";

import { useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";

export function ResetBudgetChoice({
  onConfirm,
  label = "Changer de choix",
  question = "Revenir aux choix ? Les saisies de ce mois seront perdues.",
}: {
  onConfirm: () => Promise<void>;
  label?: string;
  question?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        icon={<AppIcon name="undo" size={17} />}
        onClick={() => setConfirming(true)}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="reset-choice" role="alert">
      <span className="muted">{question}</span>
      <Button size="sm" variant="primary" disabled={busy} onClick={() => void confirm()}>
        Oui, revenir
      </Button>
      <Button size="sm" disabled={busy} onClick={() => setConfirming(false)}>
        Annuler
      </Button>
    </div>
  );
}
