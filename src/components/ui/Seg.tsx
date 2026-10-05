"use client";

type Option<T extends string> = [T, string];

export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
  full,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  full?: boolean;
}) {
  return (
    <div className={`seg${full ? " full" : ""}`} role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}
