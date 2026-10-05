import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validators";
import { loadWorkspaceSnapshot } from "@/lib/workspace";
import { jsonError } from "@/lib/utils";
import { publishWorkspace } from "@/lib/events";

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireSession();
    const body = transactionSchema.parse(await req.json());

    await prisma.transaction.create({
      data: {
        workspaceId: session.workspaceId,
        month: body.month,
        date: body.date,
        amount: body.amount,
        cat: body.cat,
        envId: body.envId || null,
        desc: body.desc,
        planned: body.planned,
        method: body.method,
        scope: body.scope,
        ownerId: body.ownerId,
        type: body.type,
        goalId: body.goalId || null,
      },
    });

    await prisma.workspace.update({
      where: { id: session.workspaceId },
      data: { updatedAt: new Date() },
    });
    publishWorkspace(session.workspaceId);
    const workspace = await loadWorkspaceSnapshot(session.workspaceId, session.userId);
    return Response.json({ workspace });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return jsonError("Non authentifié.", 401);
    if (e instanceof Error && e.name === "ZodError") return jsonError("Données invalides.");
    console.error(e);
    return jsonError("Opération non enregistrée.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session } = await requireSession();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return jsonError("Identifiant manquant.");

    const tx = await prisma.transaction.findFirst({
      where: { id, workspaceId: session.workspaceId },
    });
    if (!tx) return jsonError("Opération introuvable.", 404);

    await prisma.transaction.delete({ where: { id } });
    await prisma.workspace.update({
      where: { id: session.workspaceId },
      data: { updatedAt: new Date() },
    });
    publishWorkspace(session.workspaceId);
    const workspace = await loadWorkspaceSnapshot(session.workspaceId, session.userId);
    return Response.json({ workspace });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return jsonError("Non authentifié.", 401);
    return jsonError("Suppression impossible.", 500);
  }
}
