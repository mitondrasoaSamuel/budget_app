"use client";

import { useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";

export function ResetBudgetChoice({ onConfirm }: { onConfirm: () => Promise<void> }) {
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
        Changer de choix
      </Button>
    );
  }

  return (
    <div className="reset-choice" role="alert">
      <span className="muted">Revenir aux choix ? Les saisies de ce mois seront perdues.</span>
      <Button size="sm" variant="primary" disabled={busy} onClick={() => void confirm()}>
        Oui, revenir
      </Button>
      <Button size="sm" disabled={busy} onClick={() => setConfirming(false)}>
        Annuler
      </Button>
    </div>
  );
}
