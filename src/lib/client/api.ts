import type { WorkspaceSnapshot } from "@/lib/workspace";

async function parse<T>(resPromise: Promise<Response>): Promise<T> {
  const res = await resPromise;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Requête impossible");
  return data as T;
}

export const api = {
  me: () => parse<{ workspace: WorkspaceSnapshot | null }>(fetch("/api/me")),
  login: (login: string, password: string) =>
    parse<{ ok: boolean }>(
      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      })
    ),
  register: (body: Record<string, unknown>) =>
    parse<{ ok: boolean }>(
      fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),
  logout: () => parse<{ ok: boolean }>(fetch("/api/auth/logout", { method: "POST" })),
  patchWorkspace: (body: Record<string, unknown>) =>
    parse<{ workspace: WorkspaceSnapshot }>(
      fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),
  patchBudget: (body: Record<string, unknown>) =>
    parse<{ workspace: WorkspaceSnapshot }>(
      fetch("/api/budget", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),
  createTransaction: (body: Record<string, unknown>) =>
    parse<{ workspace: WorkspaceSnapshot }>(
      fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),
  deleteTransaction: (id: string) =>
    parse<{ workspace: WorkspaceSnapshot }>(
      fetch(`/api/transactions?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    ),
  changePassword: (current: string, next: string) =>
    parse<{ ok: boolean }>(
      fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      })
    ),
};
