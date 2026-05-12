"use client";

import Image from "next/image";

export function FooterGouv() {
  return (
    <footer style={{ background: "#0A0D1A", borderTop: "3px solid #000091", marginTop: "auto", color: "#9AA3B5", fontSize: 12 }}>
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "28px 28px 0" }}>

        {/* Contenu principal */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 40, paddingBottom: 24 }}>

          {/* Bloc identité */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              {/* Logo MN en version small */}
              <div style={{ width: 44, height: 44, position: "relative", flexShrink: 0 }}>
                <Image
                  src="/logos/marine-nationale.png"
                  alt="Marine Nationale"
                  fill
                  style={{ objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.8)" }}
                />
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>RF Intelligence Maritime</div>
                <div style={{ color: "#636878", fontSize: 11, marginTop: 2 }}>Ministère des Armées · DGA/MI · Cellule SURMAR</div>
              </div>
            </div>
            <p style={{ color: "#545D6E", fontSize: 11.5, lineHeight: 1.7, maxWidth: 380 }}>
              Maquette à usage pédagogique exclusivement. Aucune donnée classifiée.
              Positions, signatures et identités de navires sont entièrement fictives.
            </p>
            {/* Tricolore décoratif */}
            <div style={{ display: "flex", height: 3, width: 80, borderRadius: 99, overflow: "hidden", marginTop: 14, gap: 2 }}>
              <div style={{ flex: 1, background: "#002395", borderRadius: 99 }} />
              <div style={{ flex: 1, background: "#FFFFFF", borderRadius: 99, opacity: 0.6 }} />
              <div style={{ flex: 1, background: "#ED2939", borderRadius: 99 }} />
            </div>
          </div>

          {/* Liens réglementaires */}
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
              Informations légales
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {["Mentions légales", "Données personnelles", "Gestion des cookies", "Plan du site"].map((lien) => (
                <li key={lien}>
                  <span style={{ color: "#7A8494", fontSize: 12, cursor: "default", textDecoration: "underline", textDecorationColor: "rgba(122,132,148,0.4)", textUnderlineOffset: 3, transition: "color 0.15s" }}>
                    {lien}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Accessibilité */}
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
              Accessibilité
            </div>
            <div style={{ color: "#C8CDD6", fontSize: 11, marginBottom: 10 }}>
              Accessibilité : non conforme (non évalué)
            </div>
            <div style={{ color: "#3E4A5C", fontSize: 11, lineHeight: 1.6 }}>
              Conformité RGAA non évaluée · hors périmètre légal (maquette)
            </div>
          </div>
        </div>

        {/* Barre basse */}
        <div style={{
          borderTop: "1px solid #161E2C",
          padding: "14px 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#3E4A5C", letterSpacing: "0.06em" }}>
            MARITIME RF INTELLIGENCE · v1.0.0 · build 2026.05 · © Ministère des Armées / DGA
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#C64A00", letterSpacing: "0.06em" }}>
            DIFFUSION RESTREINTE — DÉMONSTRATION UNIQUEMENT
          </div>
        </div>
      </div>
    </footer>
  );
}
