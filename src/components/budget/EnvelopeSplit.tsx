"use client";

import { useState } from "react";
import { roundPct } from "@/lib/budget/envelopeSplit";
import { Input } from "@/components/ui/Input";

const pctText = (v: number) => (v ? String(v).replace(".", ",") : "");

const parsePct = (raw: string) => roundPct(Number(raw.replace(",", ".")) || 0);

export function SplitModeToggle({
  pctMode,
  onChange,
}: {
  pctMode: boolean;
  onChange: (pctMode: boolean) => void;
}) {
  return (
    <div className="split-mode">
      <span className="muted">Répartir par</span>
      <div className="seg" role="group" aria-label="Mode de répartition des enveloppes">
        <button type="button" aria-pressed={!pctMode} onClick={() => pctMode && onChange(false)}>
          Montant
        </button>
        <button type="button" aria-pressed={pctMode} onClick={() => !pctMode && onChange(true)}>
          Pourcentage
        </button>
      </div>
    </div>
  );
}

/** Saisie d’un % validée au blur (ou Entrée), bornée entre 0 et `max`. */
export function PctInput({
  id,
  label,
  value,
  max,
  onCommit,
  onClamp,
}: {
  id?: string;
  label?: string;
  value: number;
  max: number;
  onCommit: (v: number) => void;
  onClamp?: (raw: number, next: number) => void;
}) {
  const [draft, setDraft] = useState(pctText(value));
  const [synced, setSynced] = useState(value);

  if (synced !== value) {
    setSynced(value);
    setDraft(pctText(value));
  }

  const commit = () => {
    const raw = parsePct(draft);
    const next = Math.min(Math.max(0, raw), max);
    if (next !== raw) onClamp?.(raw, next);
    setDraft(pctText(next));
    if (next !== value) onCommit(next);
  };

  return (
    <Input
      id={id}
      label={label}
      suffix="%"
      inputMode="decimal"
      placeholder="0"
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d.,]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}
