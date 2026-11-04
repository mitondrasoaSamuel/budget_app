/** @type {import('next').NextConfig} */
const nextConfig = {
  // Évite les modules hashés Turbopack (@prisma/client-xxxxx) cassés au déploiement
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-mariadb", "mariadb"],
};

module.exports = nextConfig;
