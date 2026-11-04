import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import type { AppSettings } from "@/lib/defaults";
import { prisma } from "@/lib/prisma";
import { goalPatchSchema, goalSchema } from "@/lib/validators";
import { loadWorkspaceSnapshot } from "@/lib/workspace";
import { jsonError } from "@/lib/utils";
import { publishWorkspace } from "@/lib/events";

async function ownedWalletId(workspaceId: string, walletId: string | null) {
  if (!walletId) return null;
  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, workspaceId } });
  if (!wallet) throw new Error("WALLET_NOT_FOUND");
  return wallet.id;
}

function withGoalWallet(settings: AppSettings, goalId: string, walletId: string | null) {
  const goalWallets = { ...(settings.goalWallets || {}) };
  if (walletId) goalWallets[goalId] = walletId;
  else delete goalWallets[goalId];
  return { ...settings, goalWallets };
}

/** Enregistre le lien objectif → portefeuille (settings JSON) ; `undefined` = inchangé. */
async function touchWorkspace(workspaceId: string, goalId: string, walletId?: string | null) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  const settings = (ws?.settings || {}) as AppSettings;
  const next = walletId === undefined ? null : withGoalWallet(settings, goalId, walletId);
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(next ? { settings: next as unknown as Prisma.InputJsonValue } : {}),
      updatedAt: new Date(),
    },
  });
  publishWorkspace(workspaceId);
}

function goalError(e: unknown, fallback: string) {
  if (e instanceof Error && e.message === "UNAUTHORIZED") return jsonError("Non authentifié.", 401);
  if (e instanceof Error && e.message === "WALLET_NOT_FOUND") return jsonError("Portefeuille introuvable.");
  if (e instanceof Error && e.name === "ZodError") return jsonError("Données invalides.");
  console.error(e);
  return jsonError(fallback, 500);
}

async function snapshot(workspaceId: string, userId: string) {
  return Response.json({ workspace: await loadWorkspaceSnapshot(workspaceId, userId) });
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireSession();
    const body = goalSchema.parse(await req.json());
    const walletId = await ownedWalletId(session.workspaceId, body.walletId ?? null);

    const goal = await prisma.goal.create({
      data: {
        workspaceId: session.workspaceId,
        kind: body.kind,
        name: body.name,
        target: body.target,
        initial: body.initial,
        deadline: body.deadline || "",
      },
    });

    await touchWorkspace(session.workspaceId, goal.id, walletId);
    return snapshot(session.workspaceId, session.userId);
  } catch (e) {
    return goalError(e, "Objectif non créé.");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireSession();
    const body = goalPatchSchema.parse(await req.json());

    const existing = await prisma.goal.findFirst({
      where: { id: body.id, workspaceId: session.workspaceId },
    });
    if (!existing) return jsonError("Objectif introuvable.", 404);
    const walletId =
      body.walletId === undefined
        ? undefined
        : await ownedWalletId(session.workspaceId, body.walletId);

    await prisma.goal.update({
      where: { id: body.id },
      data: {
        ...(body.kind !== undefined ? { kind: body.kind } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.target !== undefined ? { target: body.target } : {}),
        ...(body.initial !== undefined ? { initial: body.initial } : {}),
        ...(body.deadline !== undefined ? { deadline: body.deadline } : {}),
      },
    });

    await touchWorkspace(session.workspaceId, body.id, walletId);
    return snapshot(session.workspaceId, session.userId);
  } catch (e) {
    return goalError(e, "Objectif non mis à jour.");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session } = await requireSession();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return jsonError("Identifiant manquant.");

    const existing = await prisma.goal.findFirst({
      where: { id, workspaceId: session.workspaceId },
    });
    if (!existing) return jsonError("Objectif introuvable.", 404);

    await prisma.goal.delete({ where: { id } });
    await touchWorkspace(session.workspaceId, id, null);
    return snapshot(session.workspaceId, session.userId);
  } catch (e) {
    return goalError(e, "Suppression impossible.");
  }
}
