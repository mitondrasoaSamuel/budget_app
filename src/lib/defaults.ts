export const CAT_PALETTE = [
  "var(--c-besoins)",
  "var(--c-epargne)",
  "var(--c-invest)",
  "var(--c-perso)",
  "#5B7C99",
  "#A66B4F",
  "#6B8F71",
  "#8B6B9E",
];

export const FONT_OPTIONS = [
  { id: "ibm", label: "IBM Plex Sans", value: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif' },
  { id: "source", label: "Source Sans 3", value: '"Source Sans 3", "Segoe UI", system-ui, sans-serif' },
  { id: "dm", label: "DM Sans", value: '"DM Sans", "Segoe UI", system-ui, sans-serif' },
  { id: "system", label: "Système", value: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
] as const;

export const DEFAULT_METHODS = ["Espèces", "Mobile Money", "Banque", "Carte", "Autre"];

export type Category = {
  id: string;
  name: string;
  short: string;
  color: string;
  kind: "expense" | "transfer";
  defaultEnvs: string[];
};

export type Branding = {
  appName: string;
  logoDataUrl: string;
  accent: string;
  ink: string;
  fontFamily: string;
  theme: "auto" | "light" | "dark";
};

export type AppSettings = {
  thresholds: [number, number, number];
  categories: Category[];
  defaultPct: Record<string, number>;
  methods: string[];
  pageSize: number;
};

export function defaultCategories(): Category[] {
  return [
    {
      id: "besoins",
      name: "Besoins essentiels",
      short: "Besoins",
      color: CAT_PALETTE[0],
      kind: "expense",
      defaultEnvs: ["Logement", "Électricité et eau", "Alimentation", "Transport", "Éducation", "Communication"],
    },
    {
      id: "epargne",
      name: "Épargne",
      short: "Épargne",
      color: CAT_PALETTE[1],
      kind: "transfer",
      defaultEnvs: ["Fonds d’urgence", "Objectif court terme", "Épargne familiale"],
    },
    {
      id: "invest",
      name: "Investissement et projets",
      short: "Projets",
      color: CAT_PALETTE[2],
      kind: "transfer",
      defaultEnvs: ["Business", "Formation", "Matériel professionnel", "Investissements", "Projets"],
    },
    {
      id: "perso",
      name: "Dépenses personnelles",
      short: "Personnel",
      color: CAT_PALETTE[3],
      kind: "expense",
      defaultEnvs: ["Loisirs", "Restaurants", "Vêtements", "Cadeaux", "Achats personnels"],
    },
  ];
}

export function defaultPct(): Record<string, number> {
  return { besoins: 50, epargne: 15, invest: 10, perso: 25 };
}

export function defaultBranding(appName = "Ariary"): Branding {
  return {
    appName,
    logoDataUrl: "",
    accent: "#1F5C4A",
    ink: "#1B1E1C",
    fontFamily: FONT_OPTIONS[0].value,
    theme: "auto",
  };
}

export function defaultSettings(): AppSettings {
  return {
    thresholds: [70, 90, 100],
    categories: defaultCategories(),
    defaultPct: defaultPct(),
    methods: [...DEFAULT_METHODS],
    pageSize: 10,
  };
}

export function defaultEnvelopes(income: number, pct: Record<string, number>, cats = defaultCategories()) {
  return cats.flatMap((c) => {
    const alloc = Math.round((income * (Number(pct[c.id]) || 0)) / 100);
    const names = c.defaultEnvs.length ? c.defaultEnvs : [c.short];
    const each = Math.floor(alloc / names.length);
    return names.map((name, i) => ({
      id: `${c.id}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      cat: c.id,
      name,
      planned: i === names.length - 1 ? alloc - each * (names.length - 1) : each,
      share: "common",
      ownerId: null as string | null,
      goalId: null as string | null,
    }));
  });
}

export const MODE_LABELS = {
  personal: "Personnel",
  couple: "En couple / famille",
  enterprise: "Entreprise",
} as const;
