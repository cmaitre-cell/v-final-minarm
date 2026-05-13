"use client";

import { ML_KPIS } from "@/lib/data";

/**
 * S/05 — Graphe de connaissances.
 * Embarque `public/knowledge_graph.html` (généré par `src/graph.py` côté Python,
 * 168 nœuds Navire/Pavillon/Anomalie/Alerte, pyvis interactif).
 */
export function GraphView() {
  return (
    <div className="grid grid-cols-12 gap-4 p-6 bg-white min-h-[calc(100vh-130px)] fade-in-stagger">
      <div className="col-span-12 panel rounded-sm">
        <div className="px-4 py-3 border-b border-ink-700/40 flex items-center justify-between">
          <div>
            <h2 className="section-title">
              Graphe de connaissances — Navire · Pavillon · Anomalie · Alerte
            </h2>
            <div className="label-tag mt-0.5">
              Construit avec NetworkX, rendu pyvis · arêtes typées par relation
              (mmsi&nbsp;→&nbsp;pavillon, mmsi&nbsp;→&nbsp;anomalie, anomalie&nbsp;→&nbsp;alerte) ·
              clic = focus, glisser = navigation, molette = zoom
            </div>
          </div>
          <a
            href="/knowledge_graph.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs"
          >
            Ouvrir en plein écran ↗
          </a>
        </div>
        <div style={{ height: "calc(100vh - 280px)", minHeight: 560 }}>
          <iframe
            src="/knowledge_graph.html"
            title="Graphe de connaissances RF Intelligence Maritime"
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        </div>
        <div className="px-4 py-2 border-t border-ink-700 text-[10px] font-mono text-steel-400 flex flex-wrap gap-x-5 gap-y-1">
          <span>{ML_KPIS.nShips} navires · {ML_KPIS.nAnomaliesTruth} anomalies de référence</span>
          <span>4 typologies de nœuds (Navire / Pavillon / Anomalie / Alerte)</span>
          <span>usage : explorer les chaînes pavillon → anomalies → alertes générées</span>
          <span className="ml-auto">généré par <code>sujet3/src/graph.py</code> · raffraîchi avec le pipeline</span>
        </div>
      </div>
    </div>
  );
}
