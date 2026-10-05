import { readSession } from "@/lib/auth";
import { loadWorkspaceSnapshot } from "@/lib/workspace";
import { jsonError } from "@/lib/utils";

export async function GET() {
  try {
    const session = await readSession();
    if (!session) return Response.json({ workspace: null });

    const workspace = await loadWorkspaceSnapshot(session.workspaceId, session.userId);
    return Response.json({ workspace });
  } catch (e) {
    console.error(e);
    return jsonError("Chargement impossible.", 500);
  }
}
