import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { jsonError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const login = body.login.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { login },
      include: { owned: { orderBy: { updatedAt: "desc" }, take: 1 } },
    });
    if (!user) return jsonError("Identifiant ou mot de passe incorrect.", 401);
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) return jsonError("Identifiant ou mot de passe incorrect.", 401);

    const workspace =
      user.owned[0] ||
      (await prisma.workspace.findFirst({
        where: { members: { some: { userId: user.id } } },
        orderBy: { updatedAt: "desc" },
      }));
    if (!workspace) return jsonError("Aucun espace associé à ce compte.", 404);

    const token = await createSessionToken({
      userId: user.id,
      workspaceId: workspace.id,
      login: user.login,
    });
    await setSessionCookie(token);
    return Response.json({ ok: true, workspaceId: workspace.id });
  } catch (e) {
    if (e instanceof Error && e.name === "ZodError") return jsonError("Données invalides.");
    console.error(e);
    return jsonError("Connexion impossible.", 500);
  }
}
