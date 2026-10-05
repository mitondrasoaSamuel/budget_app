import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workspacePatchSchema } from "@/lib/validators";
import { loadWorkspaceSnapshot } from "@/lib/workspace";
import { jsonError } from "@/lib/utils";
import { publishWorkspace } from "@/lib/events";

export async function GET() {
  try {
    const { session } = await requireSession();
    const workspace = await loadWorkspaceSnapshot(session.workspaceId, session.userId);
    if (!workspace) return jsonError("Espace introuvable.", 404);
    return Response.json({ workspace });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return jsonError("Non authentifié.", 401);
    return jsonError("Chargement impossible.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session, user } = await requireSession();
    const body = workspacePatchSchema.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      if (body.displayName || body.profilePhoto !== undefined) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            ...(body.displayName ? { displayName: body.displayName } : {}),
            ...(body.profilePhoto !== undefined ? { photoUrl: body.profilePhoto } : {}),
          },
        });
        if (body.displayName) {
          await tx.workspaceMember.updateMany({
            where: { workspaceId: session.workspaceId, userId: user.id },
            data: { name: body.displayName },
          });
        }
      }

      await tx.workspace.update({
        where: { id: session.workspaceId },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(body.branding
            ? { branding: body.branding as unknown as Prisma.InputJsonValue }
            : {}),
          ...(body.settings
            ? { settings: body.settings as unknown as Prisma.InputJsonValue }
            : {}),
        },
      });
    });

    publishWorkspace(session.workspaceId);
    const workspace = await loadWorkspaceSnapshot(session.workspaceId, session.userId);
    return Response.json({ workspace });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return jsonError("Non authentifié.", 401);
    if (e instanceof Error && e.name === "ZodError") return jsonError("Données invalides.");
    console.error(e);
    return jsonError("Mise à jour impossible.", 500);
  }
}
