"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

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

export function MoneyInput({
  label,
  value,
  onChange,
  id,
  hint,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  id?: string;
  hint?: string;
}) {
  return (
    <Input
      id={id}
      label={label}
      hint={hint}
      suffix="Ar"
      inputMode="numeric"
      value={value ? Math.round(value).toLocaleString("fr-FR") : ""}
      onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
    />
  );
}
