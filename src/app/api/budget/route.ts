import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { budgetPatchSchema } from "@/lib/validators";
import { defaultEnvelopes, defaultSettings } from "@/lib/defaults";
import { loadWorkspaceSnapshot } from "@/lib/workspace";
import { jsonError } from "@/lib/utils";
import { publishWorkspace } from "@/lib/events";

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireSession();
    const body = budgetPatchSchema.parse(await req.json());

    const ws = await prisma.workspace.findUnique({ where: { id: session.workspaceId } });
    const settings = (ws?.settings as ReturnType<typeof defaultSettings>) || defaultSettings();
    const pct = (body.pct || settings.defaultPct) as Record<string, number>;
    const envelopes =
      body.envelopes || defaultEnvelopes(0, pct, settings.categories);

    // upsert évite le crash P2002 si 2 onglets / React Strict Mode créent le même mois
    await prisma.budgetMonth.upsert({
      where: {
        workspaceId_month: { workspaceId: session.workspaceId, month: body.month },
      },
      create: {
        workspaceId: session.workspaceId,
        month: body.month,
        incomes: (body.incomes || []) as unknown as Prisma.InputJsonValue,
        pct: pct as unknown as Prisma.InputJsonValue,
        envelopes: envelopes as unknown as Prisma.InputJsonValue,
      },
      update: {
        ...(body.incomes !== undefined
          ? { incomes: body.incomes as unknown as Prisma.InputJsonValue }
          : {}),
        ...(body.pct !== undefined ? { pct: body.pct as unknown as Prisma.InputJsonValue } : {}),
        ...(body.envelopes !== undefined
          ? { envelopes: body.envelopes as unknown as Prisma.InputJsonValue }
          : {}),
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
    return jsonError("Budget non enregistré.", 500);
  }
}
