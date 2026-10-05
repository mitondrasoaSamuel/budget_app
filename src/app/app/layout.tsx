"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Spinner } from "@/components/ui/Spinner";

function viewFromPath(pathname: string) {
  if (pathname.includes("/budget")) return "budget";
  if (pathname.includes("/depenses")) return "depenses";
  if (pathname.includes("/objectifs")) return "objectifs";
  if (pathname.includes("/analyses")) return "analyses";
  if (pathname.includes("/parametres")) return "parametres";
  return "dashboard";
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { status, workspace, refresh } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const retried = useRef(false);

  useEffect(() => {
    if (status !== "ready") return;
    if (workspace) {
      retried.current = false;
      return;
    }
    if (!retried.current) {
      retried.current = true;
      void refresh();
      return;
    }
    router.replace("/login");
  }, [status, workspace, router, refresh]);

  if (status === "boot" || !workspace) {
    return (
      <div className="boot-screen">
        <Spinner block size={28} />
      </div>
    );
  }

  return <AppShell view={viewFromPath(pathname)}>{children}</AppShell>;
}
