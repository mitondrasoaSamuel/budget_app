"use client";

import { useState, type ReactNode } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";

export function ConfirmDialog({
  title,
  children,
  confirmLabel = "Confirmer",
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet-root is-center" role="alertdialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-backdrop" aria-label="Annuler" onClick={onCancel} />
      <div className="sheet-panel sheet-sm">
        <div className="sheet-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onCancel}>
            <AppIcon name="close" size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        <div className="sheet-foot">
          <Button disabled={busy} onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void confirm()}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
