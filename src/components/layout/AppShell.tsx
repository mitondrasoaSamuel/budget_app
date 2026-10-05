"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { applyBrandingTheme } from "@/lib/theme";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { FixedHeader } from "./FixedHeader";
import { Logo } from "./Logo";

const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: "home", href: "/app" },
  { id: "budget", label: "Budget", icon: "budget", href: "/app/budget" },
  { id: "depenses", label: "Dépenses", icon: "receipt", href: "/app/depenses" },
  { id: "objectifs", label: "Objectifs", icon: "target", href: "/app/objectifs" },
  { id: "analyses", label: "Analyses", icon: "chart", href: "/app/analyses" },
  { id: "parametres", label: "Paramètres", icon: "settings", href: "/app/parametres" },
] as const;

const BOTTOM_NAV = [
  { id: "dashboard", label: "Accueil", icon: "home", href: "/app" },
  { id: "budget", label: "Budget", icon: "budget", href: "/app/budget" },
  { id: "depenses", label: "Dépenses", icon: "receipt", href: "/app/depenses" },
  { id: "objectifs", label: "Objectifs", icon: "target", href: "/app/objectifs" },
] as const;

const MONTH_VIEWS = new Set(["dashboard", "budget", "depenses", "analyses"]);

export function AppShell({ children, view }: { children: ReactNode; view: string }) {
  const router = useRouter();
  const { workspace, month, setMonth, status, toast, notify } = useWorkspace();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    const apply = () => applyBrandingTheme(workspace.branding);
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [workspace?.branding]);

  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNav]);

  if (!workspace) return null;

  const logout = async () => {
    await api.logout();
    notify("Déconnecté");
    router.replace("/login");
    router.refresh();
  };

  const go = (href: string) => {
    setMobileNav(false);
    router.push(href);
  };

  const moreActive = view === "analyses" || view === "parametres";

  return (
    <div className={`app${mobileNav ? " nav-open" : ""}`}>
      <aside className={`side${mobileNav ? " open" : ""}`} id="app-side-nav">
        <div className="side-top">
          <Logo branding={workspace.branding} />
          <button type="button" className="icon-btn side-close" aria-label="Fermer le menu" onClick={() => setMobileNav(false)}>
            <AppIcon name="close" />
          </button>
        </div>
        <nav className="nav" aria-label="Navigation principale">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => go(item.href)}
            >
              <AppIcon name={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <Button
            variant="primary"
            style={{ width: "100%" }}
            onClick={() => go("/app/depenses")}
            icon={<AppIcon name="plus" />}
          >
            Ajouter une dépense
          </Button>
        </div>
      </aside>
      {mobileNav && <div className="nav-overlay" onClick={() => setMobileNav(false)} aria-hidden />}
      <div className="app-main-col">
        <FixedHeader
          workspace={workspace}
          month={month}
          showMonth={MONTH_VIEWS.has(view)}
          saving={status === "saving"}
          onMonthChange={setMonth}
          onLogout={() => void logout()}
          onMenu={() => setMobileNav(true)}
        />
        <main className="main">
          <div className="wrap">{children}</div>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navigation mobile">
        {BOTTOM_NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => router.push(item.href)}
          >
            <AppIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          aria-current={moreActive ? "page" : undefined}
          aria-expanded={mobileNav}
          aria-controls="app-side-nav"
          onClick={() => setMobileNav(true)}
        >
          <AppIcon name="menu" />
          <span>Menu</span>
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
