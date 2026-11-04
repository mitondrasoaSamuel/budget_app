import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { budgetMonthQuerySchema, budgetPatchSchema } from "@/lib/validators";
import { defaultEnvelopes, defaultSettings, type AppSettings, type Category } from "@/lib/defaults";
import { nextMonthKey, type CloseDecision } from "@/lib/closeMonth";
import { loadWorkspaceSnapshot } from "@/lib/workspace";
import { jsonError } from "@/lib/utils";
import { publishWorkspace } from "@/lib/events";

function incomeSum(incomes: unknown) {
  if (!Array.isArray(incomes)) return 0;
  return incomes.reduce((a, row) => a + (Number((row as { amount?: number }).amount) || 0), 0);
}

function pctSum(pct: unknown, cats: Category[]) {
  const map = (pct && typeof pct === "object" ? pct : {}) as Record<string, number>;
  return cats.reduce((a, c) => a + (Number(map[c.id]) || 0), 0);
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireSession();
    const body = budgetPatchSchema.parse(await req.json());

    const ws = await prisma.workspace.findUnique({ where: { id: session.workspaceId } });
    const settings = ((ws?.settings as AppSettings) || defaultSettings()) as AppSettings;
    const cats = settings.categories || [];
    const pct = (body.pct || settings.defaultPct) as Record<string, number>;
    const envelopes =
      body.envelopes || defaultEnvelopes(0, pct, settings.categories);

    const existing = await prisma.budgetMonth.findUnique({
      where: {
        workspaceId_month: { workspaceId: session.workspaceId, month: body.month },
      },
    });

    if (body.closed === true) {
      if (!existing) return jsonError("Aucun budget pour ce mois.");
      if (existing.closed) return jsonError("Ce mois est déjà clôturé.");
      if (!existing.started) {
        return jsonError("Commencez d’abord le budget avant de terminer le mois.");
      }

      const decisions = (body.closeDecisions || []) as CloseDecision[];
      for (const d of decisions) {
        if (d.action === "wallet" && d.amount > 0 && !d.walletId) {
          return jsonError(`Choisissez un portefeuille pour ${d.envName}.`);
        }
      }

      // Créditer les portefeuilles (modèle Wallet existant, pas de migration)
      for (const d of decisions) {
        if (d.action !== "wallet" || !(d.amount > 0) || !d.walletId) continue;
        const wallet = await prisma.wallet.findFirst({
          where: { id: d.walletId, workspaceId: session.workspaceId },
        });
        if (!wallet) return jsonError(`Portefeuille introuvable pour ${d.envName}.`);
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: (Number(wallet.balance) || 0) + d.amount },
        });
      }

      const nextSettings: AppSettings = {
        ...settings,
        closeDecisionsByMonth: {
          ...(settings.closeDecisionsByMonth || {}),
          [body.month]: decisions,
        },
        carriesApplied: { ...(settings.carriesApplied || {}) },
      };

      await prisma.budgetMonth.update({
        where: { id: existing.id },
        data: { closed: true },
      });

      // Ne pas créer le mois suivant ici : l’utilisateur choisit
      // (reprendre / reprendre et modifier / nouveau) sur l’écran Budget.

      await prisma.workspace.update({
        where: { id: session.workspaceId },
        data: {
          settings: nextSettings as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      publishWorkspace(session.workspaceId);
      const workspace = await loadWorkspaceSnapshot(session.workspaceId, session.userId);
      return Response.json({
        workspace,
        nextMonth: body.prepareNext !== false ? nextMonthKey(body.month) : null,
      });
    }

    if (body.started === true) {
      const incomes = body.incomes !== undefined ? body.incomes : existing?.incomes;
      const pctVal = body.pct !== undefined ? body.pct : existing?.pct ?? settings.defaultPct;
      if (incomeSum(incomes) <= 0) {
        return jsonError("Ajoutez au moins un revenu avant de commencer.");
      }
      if (pctSum(pctVal, cats) !== 100) {
        return jsonError("La répartition doit totaliser 100 % avant de commencer.");
      }
    }

    if (existing?.closed && (body.incomes !== undefined || body.pct !== undefined || body.envelopes !== undefined)) {
      return jsonError("Ce mois est clôturé : plus de modifications possibles.");
    }

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
        started: body.started === true,
        createdFrom: body.createdFrom || "new",
      },
      update: {
        ...(body.incomes !== undefined
          ? { incomes: body.incomes as unknown as Prisma.InputJsonValue }
          : {}),
        ...(body.pct !== undefined ? { pct: body.pct as unknown as Prisma.InputJsonValue } : {}),
        ...(body.envelopes !== undefined
          ? { envelopes: body.envelopes as unknown as Prisma.InputJsonValue }
          : {}),
        // On ne peut que démarrer (pas repasser en prévision via cet endpoint).
        ...(body.started === true ? { started: true } : {}),
        ...(body.createdFrom !== undefined ? { createdFrom: body.createdFrom } : {}),
      },
    });

    // Marquer les reports comme appliqués à la création du mois
    let settingsUpdate: AppSettings | null = null;
    if (!existing) {
      const closedBefore = await prisma.budgetMonth.findMany({
        where: {
          workspaceId: session.workspaceId,
          closed: true,
          month: { lt: body.month },
        },
        select: { month: true },
        orderBy: { month: "desc" },
        take: 1,
      });
      const prevClosed = closedBefore[0]?.month ?? null;
      if (prevClosed && settings.carriesApplied?.[body.month] !== prevClosed) {
        settingsUpdate = {
          ...settings,
          carriesApplied: {
            ...(settings.carriesApplied || {}),
            [body.month]: prevClosed,
          },
        };
      }
    }

    await prisma.workspace.update({
      where: { id: session.workspaceId },
      data: {
        updatedAt: new Date(),
        ...(settingsUpdate
          ? { settings: settingsUpdate as unknown as Prisma.InputJsonValue }
          : {}),
      },
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

function withoutCarryApplied(settings: AppSettings, month: string): AppSettings {
  const carriesApplied = { ...(settings.carriesApplied || {}) };
  delete carriesApplied[month];
  return { ...settings, carriesApplied };
}

async function resetBlocker(workspaceId: string, month: string) {
  const existing = await prisma.budgetMonth.findUnique({
    where: { workspaceId_month: { workspaceId, month } },
  });
  if (!existing) return "Aucun budget pour ce mois.";
  if (existing.started || existing.closed) {
    return "Ce budget est déjà démarré : impossible de revenir aux choix.";
  }
  const txCount = await prisma.transaction.count({ where: { workspaceId, month } });
  return txCount > 0 ? "Des opérations existent déjà sur ce mois." : null;
}

/** Supprime un budget en prévision pour revenir à l’écran de choix du mois. */
export async function DELETE(req: NextRequest) {
  try {
    const { session } = await requireSession();
    const { month } = budgetMonthQuerySchema.parse({
      month: req.nextUrl.searchParams.get("month"),
    });
    const blocker = await resetBlocker(session.workspaceId, month);
    if (blocker) return jsonError(blocker);

    const ws = await prisma.workspace.findUnique({ where: { id: session.workspaceId } });
    const settings = ((ws?.settings as AppSettings) || defaultSettings()) as AppSettings;
    await prisma.$transaction([
      prisma.budgetMonth.delete({
        where: { workspaceId_month: { workspaceId: session.workspaceId, month } },
      }),
      prisma.workspace.update({
        where: { id: session.workspaceId },
        data: {
          settings: withoutCarryApplied(settings, month) as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      }),
    ]);

    publishWorkspace(session.workspaceId);
    const workspace = await loadWorkspaceSnapshot(session.workspaceId, session.userId);
    return Response.json({ workspace });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return jsonError("Non authentifié.", 401);
    if (e instanceof Error && e.name === "ZodError") return jsonError("Données invalides.");
    console.error(e);
    return jsonError("Retour aux choix impossible.", 500);
  }
}
