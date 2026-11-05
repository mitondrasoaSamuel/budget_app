"use client";

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
