import { fmtNum } from "@/lib/utils";

export function Money({ v, className = "" }: { v: number; className?: string }) {
  const n = Math.round(Number(v) || 0);
  const sign = n < 0 ? "−" : "";
  return (
    <span className={`money ${className}`.trim()}>
      {sign}
      {fmtNum(Math.abs(n))}
      <span className="cur">Ar</span>
    </span>
  );
}
