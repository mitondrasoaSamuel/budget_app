import { catAlloc } from "../budgetMath";

/** Une enveloppe avec `sharePct` défini est répartie en % du budget de sa catégorie. */
export type SplitEnvelope = { id: string; cat: string; planned: number; sharePct?: number };

type SplitBudget = { incomes: unknown[]; pct: Record<string, number>; envelopes: unknown[] };

export const PCT_MAX = 100;
const PCT_PRECISION = 100;

export const roundPct = (v: number) => Math.round(v * PCT_PRECISION) / PCT_PRECISION;

export const formatPct = (v: number) => `${roundPct(Number(v) || 0).toLocaleString("fr-FR")} %`;

const floorPct = (v: number) => Math.floor(v * PCT_PRECISION) / PCT_PRECISION;

const hasPct = (e: SplitEnvelope) => typeof e.sharePct === "number";

const inCat = <T extends SplitEnvelope>(envs: T[], cat: string) =>
  envs.filter((e) => e.cat === cat);

export const pctAmount = (ceiling: number, pct: number) =>
  Math.floor((ceiling * pct) / PCT_MAX);

export function isPctSplit(envs: SplitEnvelope[], cat: string) {
  return inCat(envs, cat).some(hasPct);
}

export function catPctSum(envs: SplitEnvelope[], cat: string, excludeId?: string) {
  const others = inCat(envs, cat).filter((e) => e.id !== excludeId);
  return roundPct(others.reduce((a, e) => a + (Number(e.sharePct) || 0), 0));
}

export function catPctLeft(envs: SplitEnvelope[], cat: string, excludeId?: string) {
  return Math.max(0, roundPct(PCT_MAX - catPctSum(envs, cat, excludeId)));
}

/** Recalcule `planned` des enveloppes en % à partir du budget de leur catégorie. */
export function syncPctEnvelopes<T extends SplitEnvelope>(b: SplitBudget): T[] {
  return (b.envelopes as T[]).map((e) =>
    hasPct(e) ? { ...e, planned: pctAmount(catAlloc(b, e.cat), Number(e.sharePct)) } : e,
  );
}

const mapCat = <T extends SplitEnvelope>(envs: T[], cat: string, fn: (e: T, i: number) => T) => {
  let i = 0;
  return envs.map((e) => (e.cat === cat ? fn(e, i++) : e));
};

/** Passe une catégorie en mode % en conservant au mieux les montants actuels. */
export function toPctSplit<T extends SplitEnvelope>(b: SplitBudget, cat: string): T[] {
  const ceiling = catAlloc(b, cat);
  const share = (e: T) => (ceiling > 0 ? floorPct((e.planned / ceiling) * PCT_MAX) : 0);
  const envelopes = mapCat(b.envelopes as T[], cat, (e) => ({ ...e, sharePct: share(e) }));
  return syncPctEnvelopes<T>({ ...b, envelopes });
}

/** Repasse une catégorie en montants fixes (les montants calculés sont conservés). */
export function toAmountSplit<T extends SplitEnvelope>(envs: T[], cat: string): T[] {
  return mapCat(envs, cat, (e) => {
    const next = { ...e };
    delete next.sharePct;
    return next;
  });
}

/** Partage 100 % à parts égales ; l’arrondi restant va à la première enveloppe. */
export function equalPctSplit<T extends SplitEnvelope>(envs: T[], cat: string): T[] {
  const count = inCat(envs, cat).length;
  if (!count) return envs;
  const base = floorPct(PCT_MAX / count);
  const first = roundPct(PCT_MAX - base * (count - 1));
  return mapCat(envs, cat, (e, i) => ({ ...e, sharePct: i === 0 ? first : base }));
}

export function setEnvPct<T extends SplitEnvelope>(envs: T[], id: string, pct: number): T[] {
  return envs.map((e) => (e.id === id ? { ...e, sharePct: roundPct(pct) } : e));
}
