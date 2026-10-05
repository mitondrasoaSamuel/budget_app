import type { HouseholdMode, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { defaultBranding, defaultEnvelopes, defaultSettings, type AppSettings, type Branding } from "./defaults";
import { monthKey } from "./utils";

export type WorkspaceSnapshot = {
  id: string;
  name: string;
  mode: HouseholdMode;
  branding: Branding;
  settings: AppSettings;
  members: { id: string; localId: string; name: string; role: string }[];
  viewer: string;
  profilePhoto: string;
  login: string;
  displayName: string;
  budgets: Record<
    string,
    {
      incomes: unknown[];
      pct: Record<string, number>;
      envelopes: unknown[];
      closed: boolean;
      createdFrom: string;
    }
  >;
  transactions: Array<{
    id: string;
    month: string;
    date: string;
    amount: number;
    cat: string;
    envId: string | null;
    desc: string;
    planned: boolean;
    method: string;
    scope: string;
    ownerId: string;
    type: string;
    goalId: string | null;
  }>;
  goals: Array<{ id: string; kind: string; name: string; target: number; initial: number; deadline: string }>;
  wallets: Array<{ id: string; name: string; kind: string; balance: number }>;
  updatedAt: string;
};

export async function createWorkspaceForUser(input: {
  userId: string;
  displayName: string;
  partner?: string;
  company?: string;
  income: number;
  mode: HouseholdMode;
}) {
  const settings = defaultSettings();
  const branding = defaultBranding(input.mode === "enterprise" ? input.company || "Entreprise" : "Ariary");
  const name =
    input.mode === "enterprise"
      ? input.company || `Entreprise ${input.displayName}`
      : input.mode === "couple"
        ? `Foyer ${input.displayName}`
        : `Budget ${input.displayName}`;

  const month = monthKey();
  const pct = settings.defaultPct;
  const incomes =
    input.income > 0
      ? [
          {
            id: "inc-1",
            source: input.mode === "enterprise" ? "Chiffre d’affaires" : "Salaire",
            amount: input.income,
            memberId: "m1",
          },
        ]
      : [];

  const workspace = await prisma.workspace.create({
    data: {
      name,
      mode: input.mode,
      branding: branding as unknown as Prisma.InputJsonValue,
      settings: settings as unknown as Prisma.InputJsonValue,
      ownerId: input.userId,
      members: {
        create: [
          { localId: "m1", name: input.displayName, role: "owner", userId: input.userId },
          ...(input.mode === "couple"
            ? [{ localId: "m2", name: input.partner || "Partenaire", role: "member" }]
            : []),
        ],
      },
      budgets: {
        create: {
          month,
          incomes: incomes as unknown as Prisma.InputJsonValue,
          pct: pct as unknown as Prisma.InputJsonValue,
          envelopes: defaultEnvelopes(input.income, pct) as unknown as Prisma.InputJsonValue,
          createdFrom: "new",
        },
      },
      goals: {
        create: {
          kind: "saving",
          name: "Fonds d’urgence",
          target: Math.max(0, Math.round(input.income * 1.5)),
          initial: 0,
        },
      },
      wallets: {
        create: [
          { name: "Épargne de sécurité", kind: "security", balance: 0 },
          { name: "Fonds d’urgence", kind: "emergency", balance: 0 },
          { name: "Investissement", kind: "invest", balance: 0 },
        ],
      },
    },
  });

  return workspace;
}

export async function loadWorkspaceSnapshot(workspaceId: string, userId: string): Promise<WorkspaceSnapshot | null> {
  const ws = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      members: true,
      budgets: true,
      transactions: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
      goals: true,
      wallets: true,
      owner: true,
    },
  });
  if (!ws) return null;

  const budgets: WorkspaceSnapshot["budgets"] = {};
  for (const b of ws.budgets) {
    budgets[b.month] = {
      incomes: b.incomes as unknown[],
      pct: b.pct as Record<string, number>,
      envelopes: b.envelopes as unknown[],
      closed: b.closed,
      createdFrom: b.createdFrom,
    };
  }

  return {
    id: ws.id,
    name: ws.name,
    mode: ws.mode,
    branding: ws.branding as Branding,
    settings: ws.settings as AppSettings,
    members: ws.members.map((m) => ({ id: m.id, localId: m.localId, name: m.name, role: m.role })),
    viewer: ws.members.find((m) => m.userId === userId)?.localId || "m1",
    profilePhoto: ws.owner.photoUrl || "",
    login: ws.owner.login,
    displayName: ws.owner.displayName,
    budgets,
    transactions: ws.transactions.map((t) => ({
      id: t.id,
      month: t.month,
      date: t.date,
      amount: t.amount,
      cat: t.cat,
      envId: t.envId,
      desc: t.desc,
      planned: t.planned,
      method: t.method,
      scope: t.scope,
      ownerId: t.ownerId,
      type: t.type,
      goalId: t.goalId,
    })),
    goals: ws.goals.map((g) => ({
      id: g.id,
      kind: g.kind,
      name: g.name,
      target: g.target,
      initial: g.initial,
      deadline: g.deadline,
    })),
    wallets: ws.wallets.map((w) => ({ id: w.id, name: w.name, kind: w.kind, balance: w.balance })),
    updatedAt: ws.updatedAt.toISOString(),
  };
}
