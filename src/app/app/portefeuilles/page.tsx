"use client";

import { useMemo, useState } from "react";
import { depositsOf, walletDeposits } from "@/lib/wallets";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Money } from "@/components/ui/Money";
import { WalletCards } from "@/components/wallets/WalletCards";
import { WalletHistory } from "@/components/wallets/WalletHistory";

export default function PortefeuillesPage() {
  const { workspace } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const deposits = useMemo(() => (workspace ? walletDeposits(workspace) : []), [workspace]);

  if (!workspace) return null;
  const total = workspace.wallets.reduce((a, w) => a + w.balance, 0);
  const selected = workspace.wallets.find((w) => w.id === selectedId);
  const shown = selected ? depositsOf(deposits, selected.id) : deposits;

  return (
    <div className="page">
      <div className="page-head">
        <h2>Portefeuilles</h2>
        <p>
          Total placé : <Money v={total} />. Cliquez sur un portefeuille pour voir ses versements.
        </p>
      </div>

      <section className="block">
        <WalletCards
          workspace={workspace}
          deposits={deposits}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </section>

      <WalletHistory
        key={selectedId || "all"}
        workspace={workspace}
        deposits={shown}
        title={selected ? `Versements — ${selected.name}` : "Tous les versements"}
      />
    </div>
  );
}
