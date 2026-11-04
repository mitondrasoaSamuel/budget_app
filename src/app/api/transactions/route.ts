import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validators";
import type { AppSettings, EnvelopeAid } from "@/lib/defaults";
import { loadWorkspaceSnapshot } from "@/lib/workspace";
import { jsonError } from "@/lib/utils";
import { publishWorkspace } from "@/lib/events";

function aidId() {
  return `aid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireSession();
    const body = transactionSchema.parse(await req.json());

    const budget = await prisma.budgetMonth.findUnique({
      where: {
        workspaceId_month: { workspaceId: session.workspaceId, month: body.month },
      },
    });
    if (!budget?.started) {
      return jsonError("Commencez d’abord le budget du mois (page Budget) avant d’enregistrer une dépense.");
    }
    if (budget.closed) {
      return jsonError("Ce mois est clôturé : impossible d’ajouter une opération.");
    }

    const tx = await prisma.transaction.create({
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

    if (body.aids?.length && body.envId) {
      const envelopes = (budget.envelopes || []) as { id: string; name: string }[];
      const nameOf = (id: string) => envelopes.find((e) => e.id === id)?.name || "Enveloppe";
      const ws = await prisma.workspace.findUnique({
        where: { id: session.workspaceId },
        select: { settings: true },
      });
      const settings = (ws?.settings || {}) as AppSettings;
      const newAids: EnvelopeAid[] = body.aids.map((a) => ({
        id: aidId(),
        month: body.month,
        date: body.date,
        fromEnvId: a.fromEnvId,
        toEnvId: body.envId!,
        amount: a.amount,
        mode: a.mode,
        linkedTxId: tx.id,
        desc:
          a.mode === "emergency"
            ? `Urgence : ${a.amount} Ar transférés de ${nameOf(a.fromEnvId)} vers ${nameOf(body.envId!)}`
            : `Transfert : ${a.amount} Ar de ${nameOf(a.fromEnvId)} vers ${nameOf(body.envId!)}`,
      }));
      const nextSettings: AppSettings = {
        ...settings,
        aids: [...(settings.aids || []), ...newAids],
      };
      await prisma.workspace.update({
        where: { id: session.workspaceId },
        data: {
          settings: nextSettings as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.workspace.update({
        where: { id: session.workspaceId },
        data: { updatedAt: new Date() },
      });
    }

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

    // Annuler les transferts liés (settings.aids)
    const ws = await prisma.workspace.findUnique({
      where: { id: session.workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings || {}) as AppSettings;
    if (settings.aids?.some((a) => a.linkedTxId === id)) {
      const nextSettings: AppSettings = {
        ...settings,
        aids: (settings.aids || []).filter((a) => a.linkedTxId !== id),
      };
      await prisma.workspace.update({
        where: { id: session.workspaceId },
        data: {
          settings: nextSettings as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.workspace.update({
        where: { id: session.workspaceId },
        data: { updatedAt: new Date() },
      });
    }

    publishWorkspace(session.workspaceId);
    const workspace = await loadWorkspaceSnapshot(session.workspaceId, session.userId);
    return Response.json({ workspace });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return jsonError("Non authentifié.", 401);
    return jsonError("Suppression impossible.", 500);
  }
}
