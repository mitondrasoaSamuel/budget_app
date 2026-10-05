import { z } from "zod";

export const loginSchema = z.object({
  login: z.string().trim().min(3).max(64),
  password: z.string().min(4).max(128),
});

export const registerSchema = z.object({
  login: z.string().trim().min(3).max(64),
  password: z.string().min(4).max(128),
  displayName: z.string().trim().min(1).max(120),
  partner: z.string().trim().max(120).optional().default(""),
  company: z.string().trim().max(160).optional().default(""),
  income: z.number().int().min(0).max(1_000_000_000).default(0),
  mode: z.enum(["personal", "couple", "enterprise"]),
});

export const transactionSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().positive(),
  cat: z.string().min(1).max(64),
  envId: z.string().max(64).nullable().optional(),
  desc: z.string().trim().min(1).max(255),
  planned: z.boolean().default(true),
  method: z.string().min(1).max(64),
  scope: z.enum(["common", "personal"]).default("common"),
  ownerId: z.string().min(1).max(64),
  type: z.enum(["expense", "transfer"]),
  goalId: z.string().max(64).nullable().optional(),
});

export const workspacePatchSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  branding: z
    .object({
      appName: z.string().min(1).max(80),
      logoDataUrl: z.string(),
      accent: z.string().min(4).max(32),
      ink: z.string().min(4).max(32),
      fontFamily: z.string().min(1).max(200),
      theme: z.enum(["auto", "light", "dark"]),
    })
    .optional(),
  settings: z
    .object({
      thresholds: z.tuple([z.number(), z.number(), z.number()]),
      categories: z.array(z.any()),
      defaultPct: z.record(z.string(), z.number()),
      methods: z.array(z.string()),
      pageSize: z.number().int().min(5).max(50),
    })
    .optional(),
  profilePhoto: z.string().nullable().optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export const budgetPatchSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  incomes: z.array(z.any()).optional(),
  pct: z.record(z.string(), z.number()).optional(),
  envelopes: z.array(z.any()).optional(),
});

export const passwordSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(4).max(128),
});
