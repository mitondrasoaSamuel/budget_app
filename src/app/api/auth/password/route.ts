import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validators";
import { jsonError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireSession();
    const body = passwordSchema.parse(await req.json());
    const ok = await verifyPassword(body.current, user.passwordHash);
    if (!ok) return jsonError("Mot de passe actuel incorrect.", 401);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.next) },
    });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return jsonError("Non authentifié.", 401);
    if (e instanceof Error && e.name === "ZodError") return jsonError("Données invalides.");
    return jsonError("Mise à jour impossible.", 500);
  }
}
