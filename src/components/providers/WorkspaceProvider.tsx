"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/client/api";
import type { WorkspaceSnapshot } from "@/lib/workspace";
import { monthKey } from "@/lib/utils";

type Ctx = {
  status: "boot" | "ready" | "saving";
  workspace: WorkspaceSnapshot | null;
  month: string;
  view: string;
  toast: string | null;
  setMonth: (m: string) => void;
  setView: (v: string) => void;
  notify: (msg: string) => void;
  refresh: () => Promise<void>;
  setWorkspace: (ws: WorkspaceSnapshot | null) => void;
  setSaving: (v: boolean) => void;
};

const WorkspaceContext = createContext<Ctx | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"boot" | "ready" | "saving">("boot");
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [month, setMonth] = useState(monthKey());
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("boot");
    try {
      const { workspace: ws } = await api.me();
      setWorkspace(ws ?? null);
    } catch {
      setWorkspace(null);
    } finally {
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!workspace) return;
    const es = new EventSource("/api/stream");
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { workspace?: WorkspaceSnapshot };
        if (data.workspace) setWorkspace(data.workspace);
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      /* browser reconnects */
    };
    return () => es.close();
  }, [workspace?.id]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      status,
      workspace,
      month,
      view,
      toast,
      setMonth,
      setView,
      notify,
      refresh,
      setWorkspace,
      setSaving: (v) => setStatus(v ? "saving" : "ready"),
    }),
    [status, workspace, month, view, toast, notify, refresh]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
