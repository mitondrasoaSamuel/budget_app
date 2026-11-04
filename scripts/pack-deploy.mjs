/**
 * Prépare un tar.gz Linux après un build local.
 * Usage : npm run build && npm run pack:deploy
 *
 * package.json déployé = deps prod uniquement + .npmrc ignore-scripts
 * (évite "Erreur inconnue" DirectAdmin sur postinstall Prisma/SWC).
 */
import { mkdir, cp, rm, access, writeFile, readdir, stat, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "deploy-dist");
const archivePath = join(root, "ariary-deploy.tar.gz");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyTree(src, dest) {
  const s = await stat(src);
  if (s.isFile() === false && s.isDirectory() === false) return;
  if (s.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      await copyTree(join(src, entry.name), join(dest, entry.name));
    }
    return;
  }
  if (s.isFile()) await cp(src, dest);
}

async function copyNextProduction(srcNext, destNext) {
  await mkdir(destNext, { recursive: true });
  const entries = await readdir(srcNext, { withFileTypes: true });
  const skip = new Set(["dev", "cache", "types"]);

  for (const entry of entries) {
    if (skip.has(entry.name) || entry.isSymbolicLink()) continue;
    await copyTree(join(srcNext, entry.name), join(destNext, entry.name));
  }
}

async function writeProductionPackageJson() {
  const full = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const slim = {
    name: full.name,
    version: full.version,
    private: true,
    scripts: {
      start: "node serveur.js",
    },
    dependencies: {
      "@next/swc-wasm-nodejs": "16.3.8",
      "@prisma/adapter-mariadb": "6.19.0",
      "@prisma/client": "6.19.0",
      bcryptjs: full.dependencies.bcryptjs,
      jose: full.dependencies.jose,
      mariadb: full.dependencies.mariadb,
      next: "16.3.8",
      prisma: "6.19.0",
      react: "19.2.8",
      "react-dom": "19.2.8",
      "react-icons": full.dependencies["react-icons"],
      zod: full.dependencies.zod,
    },
    engines: { node: "20.x" },
  };
  await writeFile(join(outDir, "package.json"), JSON.stringify(slim, null, 2) + "\n", "utf8");
}

async function main() {
  if (!(await exists(join(root, ".next")))) {
    console.error("Manquant : .next — lance d'abord : npm run build");
    process.exit(1);
  }
  for (const item of ["public", "package.json", "serveur.js", "prisma"]) {
    if (!(await exists(join(root, item)))) {
      console.error(`Manquant : ${item}`);
      process.exit(1);
    }
  }

  await rm(outDir, { recursive: true, force: true });
  await rm(archivePath, { force: true });
  await mkdir(outDir, { recursive: true });

  await copyNextProduction(join(root, ".next"), join(outDir, ".next"));

  for (const item of ["public", "prisma", "serveur.js", "next.config.js"]) {
    await copyTree(join(root, item), join(outDir, item));
  }

  await writeProductionPackageJson();

  // DirectAdmin : ignore-scripts évite les plantages postinstall (erreur inconnue)
  await writeFile(
    join(outDir, ".npmrc"),
    ["ignore-scripts=true", "fund=false", "audit=false", "omit=dev", "legacy-peer-deps=true", ""].join("\n"),
    "utf8",
  );

  await writeFile(
    join(outDir, "DEPLOY-README.txt"),
    [
      "1. Vider softika-officiel/budge complètement",
      "2. Extraire ariary-deploy.tar.gz ici",
      "3. Vérifier : package.json, .npmrc, serveur.js, .next/, prisma/, public/",
      "4. Variables : DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_NAME",
      "5. Exécuter NPM Install (attendre la fin)",
      "6. REDÉMARRER",
      "",
    ].join("\n"),
    "utf8",
  );

  const tar = spawnSync("tar", ["-czf", archivePath, "-C", outDir, "."], {
    stdio: "inherit",
  });

  if (tar.status !== 0) {
    console.error("Échec tar.gz — dossier deploy-dist/ prêt à uploader.");
    process.exit(1);
  }

  console.log(`OK → ${archivePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
