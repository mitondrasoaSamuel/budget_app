import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { createWorkspaceForUser } from "@/lib/workspace";
import { jsonError } from "@/lib/utils";
import { publishWorkspace } from "@/lib/events";

export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json());
    const login = body.login.trim().toLowerCase();
    const exists = await prisma.user.findUnique({ where: { login } });
    if (exists) return jsonError("Cet identifiant est déjà utilisé.", 409);

    const user = await prisma.user.create({
      data: {
        login,
        passwordHash: await hashPassword(body.password),
        displayName: body.displayName,
      },
    });

    const workspace = await createWorkspaceForUser({
      userId: user.id,
      displayName: body.displayName,
      partner: body.partner,
      company: body.company,
      income: body.income,
      mode: body.mode,
    });

    const token = await createSessionToken({
      userId: user.id,
      workspaceId: workspace.id,
      login: user.login,
    });
    await setSessionCookie(token);
    publishWorkspace(workspace.id);

    return Response.json({ ok: true, workspaceId: workspace.id });
  } catch (e) {
    if (e instanceof Error && e.name === "ZodError") return jsonError("Données invalides.");
    console.error(e);
    return jsonError("Création du compte impossible.", 500);
  }
}
