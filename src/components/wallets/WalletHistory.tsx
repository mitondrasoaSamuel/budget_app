"use client";

import { useState } from "react";
import { catOf } from "@/lib/budgetMath";
import { monthLabel, paginate } from "@/lib/utils";
import type { WalletDeposit } from "@/lib/wallets";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import { Money } from "@/components/ui/Money";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 10;

export function WalletHistory({
  workspace,
  deposits,
  title,
}: {
  workspace: WorkspaceSnapshot;
  deposits: WalletDeposit[];
  title: string;
}) {
  const [page, setPage] = useState(1);
  const paged = paginate(deposits, page, PAGE_SIZE);
  const walletName = (id: string) => workspace.wallets.find((w) => w.id === id)?.name || "—";

  return (
    <section className="block">
      <div className="block-head">
        <h3>{title}</h3>
        <p>Restes d’enveloppes envoyés en portefeuille à la clôture du mois.</p>
      </div>
      {!deposits.length ? (
        <p className="muted">
          Aucun versement. Au moment de « Terminer le mois », choisissez « Envoyer en
          portefeuille » pour une enveloppe.
        </p>
      ) : (
        <div className="tx-list">
          {paged.items.map((d) => (
            <div className="tx-row" key={d.id}>
              <div>
                <div className="tx-desc">{d.envName}</div>
                <div className="tx-meta muted">
                  {monthLabel(d.month)} · {catOf(workspace, d.cat).short} · vers{" "}
                  {walletName(d.walletId)}
                </div>
              </div>
              <div className="tx-amt wallet-in">
                +<Money v={d.amount} />
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination {...paged} onChange={setPage} />
    </section>
  );
}
