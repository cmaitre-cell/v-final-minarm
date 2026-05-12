import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RF Intelligence Maritime · Ministère des Armées",
  description:
    "Plateforme de surveillance passive et de détection d'anomalies maritimes · DGA/MI · Cellule SURMAR · maquette pédagogique",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body>{children}</body>
    </html>
  );
}
