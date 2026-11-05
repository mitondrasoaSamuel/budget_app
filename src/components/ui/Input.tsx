"use client";

import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  suffix?: ReactNode;
};

export function Input({ label, hint, suffix, id, className = "", ...rest }: Props) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <div className={suffix ? "input-suffix" : undefined}>
        <input id={id} className={`input ${className}`.trim()} {...rest} />
        {suffix && <span>{suffix}</span>}
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

const PCT_PRECISION = 100;

const pctText = (v: number) =>
  String(Math.round((Number(v) || 0) * PCT_PRECISION) / PCT_PRECISION).replace(".", ",");

const parsePct = (raw: string) =>
  Math.round((Number(raw.replace(",", ".")) || 0) * PCT_PRECISION) / PCT_PRECISION;

/** Saisie d’un % : vide autorisé pendant la frappe, 0 au blur ; onCommit seulement au blur / Entrée. */
export function PctInput({
  id,
  label,
  value,
  max = 100,
  disabled,
  className,
  ariaLabel,
  onCommit,
  onClamp,
}: {
  id?: string;
  label?: string;
  value: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
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
      className={className}
      aria-label={ariaLabel}
      disabled={disabled}
      inputMode="decimal"
      placeholder="0"
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d.,]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

function formatMoney(v: number) {
  return v ? Math.round(v).toLocaleString("fr-FR") : "";
}

function parseMoney(raw: string) {
  return Number(raw.replace(/[^\d]/g, "")) || 0;
}

export function MoneyInput({
  label,
  value,
  onChange,
  id,
  hint,
  big = false,
  commitOnBlur = false,
  normalize,
  onClamp,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  id?: string;
  hint?: string;
  big?: boolean;
  /** Si true, onChange n’est appelé qu’au blur (évite les requêtes à chaque frappe). */
  commitOnBlur?: boolean;
  /** Appliqué au blur avant onChange (ex. plafond). */
  normalize?: (v: number) => number;
  /** Appelé si normalize a réduit la valeur saisie (feedback UX). */
  onClamp?: (raw: number, next: number) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const display = commitOnBlur ? draft : value;

  const commit = () => {
    if (!commitOnBlur) return;
    const raw = draft;
    const next = normalize ? normalize(raw) : raw;
    if (next !== raw) {
      setDraft(next);
      onClamp?.(raw, next);
    }
    if (next === value) return;
    onChange(next);
  };

  return (
    <Input
      id={id}
      label={label}
      hint={hint}
      suffix="Ar"
      className={big ? "big" : ""}
      inputMode="numeric"
      value={formatMoney(display)}
      onChange={(e) => {
        const n = parseMoney(e.target.value);
        if (commitOnBlur) {
          setDraft(n);
        } else {
          onChange(n);
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (!commitOnBlur || e.key !== "Enter") return;
        (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
