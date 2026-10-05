"use client";

import { FiLogOut } from "react-icons/fi";
import { MODE_LABELS } from "@/lib/defaults";
import { monthLabel, shiftMonth } from "@/lib/utils";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import { AppIcon } from "../ui/AppIcon";
import { Button } from "../ui/Button";
import { Logo } from "./Logo";

export function FixedHeader({
  workspace,
  month,
  showMonth,
  saving,
  onMonthChange,
  onLogout,
  onMenu,
}: {
  workspace: WorkspaceSnapshot;
  month: string;
  showMonth?: boolean;
  saving?: boolean;
  onMonthChange: (m: string) => void;
  onLogout: () => void;
  onMenu?: () => void;
}) {
  const member = workspace.members.find((m) => m.localId === workspace.viewer);
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-left">
          {onMenu && (
            <button
              type="button"
              className="icon-btn header-menu"
              aria-label="Ouvrir le menu"
              aria-controls="app-side-nav"
              onClick={onMenu}
            >
              <AppIcon name="menu" size={20} />
            </button>
          )}
          <div className="header-brand">
            <Logo branding={workspace.branding} compact />
          </div>
        </div>
        {showMonth ? (
          <div className="month-switch">
            <button type="button" className="icon-btn" aria-label="Mois précédent" onClick={() => onMonthChange(shiftMonth(month, -1))}>
              <AppIcon name="left" />
            </button>
            <h1>{monthLabel(month)}</h1>
            <button type="button" className="icon-btn" aria-label="Mois suivant" onClick={() => onMonthChange(shiftMonth(month, 1))}>
              <AppIcon name="right" />
            </button>
          </div>
        ) : (
          <div />
        )}
        <div className="app-header-right">
          {saving && <span className="save-pill muted">Enregistrement…</span>}
          <div className="profile-chip">
            {workspace.profilePhoto ? (
              <img src={workspace.profilePhoto} alt="" className="avatar" />
            ) : (
              <span className="avatar avatar-fallback">{(member?.name || "?").slice(0, 1).toUpperCase()}</span>
            )}
            <div className="profile-meta">
              <strong>{member?.name || workspace.displayName}</strong>
              <span className="faint">{MODE_LABELS[workspace.mode]}</span>
            </div>
          </div>
          <Button variant="logout" size="sm" onClick={onLogout} icon={<FiLogOut size={16} />}>
            <span className="logout-label">Quitter</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
