"use client";

import { useMemo, useState } from "react";
import { catOf } from "@/lib/budgetMath";
import { dateLabel, paginate } from "@/lib/utils";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import type { EnvelopeRow } from "@/components/budget/EnvelopeSheets";
import { Money } from "@/components/ui/Money";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 8;

function monthWithdrawals(workspace: WorkspaceSnapshot, month: string) {
  return workspace.transactions
    .filter((t) => t.month === month && t.envId)
    .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
}

export function MonthWithdrawals({
  workspace,
  month,
  envelopes,
  onOpenEnvelope,
}: {
  workspace: WorkspaceSnapshot;
  month: string;
  envelopes: EnvelopeRow[];
  onOpenEnvelope: (env: EnvelopeRow) => void;
}) {
  const [page, setPage] = useState(1);
  const list = useMemo(
    () => monthWithdrawals(workspace, month),
    [workspace.transactions, month],
  );
  const total = list.reduce((a, t) => a + t.amount, 0);
  const paged = paginate(list, page, PAGE_SIZE);
  const envById = (id?: string | null) => envelopes.find((e) => e.id === id);

  return (
    <section className="block">
      <div className="block-head">
        <h3>Retraits du mois</h3>
        <p>
          {list.length} retrait{list.length > 1 ? "s" : ""} · total <Money v={total} />
        </p>
      </div>
      {!list.length ? (
        <p className="muted">Aucun retrait pour le moment.</p>
      ) : (
        <div className="tx-list">
          {paged.items.map((tx) => {
            const env = envById(tx.envId);
            return (
              <button
                type="button"
                className="tx-row tx-row-btn"
                key={tx.id}
                disabled={!env}
                onClick={() => env && onOpenEnvelope(env)}
              >
                <div>
                  <div className="tx-desc">{tx.desc}</div>
                  <div className="tx-meta muted">
                    {dateLabel(tx.date)} · {catOf(workspace, tx.cat).short} · {env?.name || "—"}
                  </div>
                </div>
                <div className="tx-amt">
                  <Money v={-tx.amount} />
                </div>
              </button>
            );
          })}
        </div>
      )}
      <Pagination {...paged} onChange={setPage} />
    </section>
  );
}
