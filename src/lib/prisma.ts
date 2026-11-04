import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

function adapterFromDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL manquant");
  }

  try {
    const u = new URL(raw);
    return new PrismaMariaDb({
      host: u.hostname || "127.0.0.1",
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, "").split("?")[0] || ""),
      connectionLimit: 4,
      connectTimeout: 15_000,
      acquireTimeout: 15_000,
    });
  } catch {
    return new PrismaMariaDb(raw);
  }
}

function createPrisma() {
  return new PrismaClient({
    adapter: adapterFromDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();
globalForPrisma.prisma = prisma;
