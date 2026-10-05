import type { Metadata, Viewport } from "next";
import { WorkspaceProvider } from "@/components/providers/WorkspaceProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ariary — Budget",
  description: "Budget personnel, couple ou entreprise",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#121413" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Sans+3:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
