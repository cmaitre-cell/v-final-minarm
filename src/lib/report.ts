// Génération de rapports PDF (côté client) — onglet S/04 « Détection d'anomalies ».
// Approche : on ouvre une vue HTML mise en page A4 à la charte de l'État (police Marianne,
// bleu France #000091, mise en page DSFR), puis on déclenche window.print() → l'utilisateur
// choisit « Enregistrer au format PDF ». La Marianne est celle du dashboard (woff2 servies
// depuis /public/fonts). Pas de dépendance externe.
//
//   - generateAnomalyAlertPdf(anomaly, recommandations) : fiche d'alerte d'une anomalie
//   - generateDetectionReportPdf({ kpis, recallByType })  : rapport de détection (synthèse)

import type { Anomaly } from "./data";

type Kpis = {
  nShips: number;
  nProfiled: number;
  nSignatures: number;
  nAnomaliesTruth: number;
  nSilentShips: number;
  nSilentSuspicious: number;
  nAisOffBlocks: number;
  nAisOffMmsi: number;
  nPosMismatchPairs: number;
  nPosMismatchMmsi: number;
  nFakeFlagFlagged: number;
  nNameChangeFlagged: number;
  nOrphans: number;
  achievableRecallCeiling: number;
  achievableRecallCeilingBefore: number;
  nUnrecoverable: number;
  nUnrecoverableBefore: number;
  recallOverall: number;
  recallOverallBefore: number;
  nRecoveredKinematic: number;
  scoreAuc: number;
  scorePrecisionAtK: number;
  kmeansK: number;
  silhouette: number;
};

type RecallRow = {
  type: string;
  nTruth: number;
  nOverlap: number;
  recall: number;
  recoverable: boolean;
  note: string;
};

const SEV_HEX: Record<string, string> = {
  critical: "#CE0500",
  high: "#C64A00",
  medium: "#8B5E00",
  low: "#18753C",
};

const recallColor = (r: RecallRow) =>
  !r.recoverable ? "#9AA3B5" : r.recall >= 0.3 ? "#18753C" : r.recall > 0 ? "#C64A00" : "#CE0500";

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const fmtMmsi = (m: number) =>
  !m ? "—" : m.toString().replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");

const fr = (n: number) => n.toLocaleString("fr-FR");
const pct = (x: number) => Math.round(x * 100);

const SHELL_CSS = `
@font-face{font-family:"Marianne";src:url("/fonts/Marianne-Regular.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Marianne";src:url("/fonts/Marianne-Medium.woff2") format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"Marianne";src:url("/fonts/Marianne-Bold.woff2") format("woff2");font-weight:700;font-display:swap}
@page{size:A4;margin:14mm 16mm}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:"Marianne",system-ui,-apple-system,sans-serif;color:#1E2232;font-size:10.5px;line-height:1.5;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet{max-width:182mm;margin:0 auto;padding:18px 18px 28px}
@media print{.no-print{display:none!important}.sheet{padding:0}}
.toolbar{position:sticky;top:0;z-index:9;background:#161616;color:#fff;padding:9px 18px;font-size:12px;display:flex;gap:14px;align-items:center}
.toolbar button{font:inherit;background:#fff;color:#161616;border:0;border-radius:4px;padding:5px 13px;cursor:pointer;font-weight:700}
.gov{display:flex;align-items:flex-start;gap:16px;border-bottom:3px solid #000091;padding-bottom:10px}
.id{display:flex;flex-direction:column;gap:7px}
.mb{font-weight:700;line-height:1.05}.mb .rf{font-size:12.5px;letter-spacing:.01em}.mb .dev{font-size:7px;font-style:italic;font-weight:400;color:#3a3a3a;margin-top:3px}
.logo{height:46px;width:46px;object-fit:contain;display:block}
.dt{margin-left:auto;text-align:right}.dt .t{font-size:16px;font-weight:700;color:#000091;letter-spacing:.01em}.dt .s{font-size:9.5px;color:#5C6378;max-width:92mm;margin-left:auto}.dt .r{font-size:8.5px;color:#5C6378;font-weight:700;margin-top:3px;text-transform:uppercase;letter-spacing:.04em}
.meta{display:flex;gap:16px;flex-wrap:wrap;font-size:8.5px;color:#5C6378;margin:9px 0 14px}.meta b{color:#161616;font-weight:500}
.classif{background:#FEECEC;border:1px solid #F6C6C6;color:#A8312B;padding:1px 7px;border-radius:3px;font-weight:700;font-size:8px}
h2{font-size:11px;color:#000091;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #D8D8E8;padding-bottom:3px;margin:17px 0 8px}
p{margin:0 0 8px}.tight{margin-bottom:5px}
.band{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;border-left:4px solid #000091;background:#F5F5FE;padding:11px 14px;margin:4px 0 4px;border-radius:0 4px 4px 0}
.band .l{font-size:7.5px;text-transform:uppercase;letter-spacing:.04em;color:#5C6378}.band .v{font-size:13px;font-weight:700;color:#161616;margin-top:3px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:4px 0 10px}
.stat{border:1px solid #E3E3FD;border-radius:6px;padding:9px 11px;background:#F5F5FE}
.stat .v{font-size:19px;font-weight:700;color:#000091;line-height:1}.stat .l{font-size:7.5px;color:#5C6378;text-transform:uppercase;letter-spacing:.04em;margin-top:6px}
table{width:100%;border-collapse:collapse;margin:4px 0 9px;font-size:9.5px}
th{text-align:left;font-size:7.5px;text-transform:uppercase;letter-spacing:.04em;color:#5C6378;font-weight:500;border-bottom:1px solid #D8D8E8;padding:4px 6px}
td{padding:5px 6px;border-bottom:1px solid #EDEDF5;vertical-align:middle}
td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}td.bar{width:42%}td.bar b{margin-left:8px;font-variant-numeric:tabular-nums}
td.note{font-size:8px;color:#9AA3B5}
table.kv td{border-bottom:1px solid #EDEDF5}table.kv td.k{font-size:7.5px;text-transform:uppercase;letter-spacing:.04em;color:#5C6378;width:21%;white-space:nowrap}
.track{display:inline-block;width:48%;height:7px;background:#EDEDF5;border-radius:2px;vertical-align:middle}.fill{display:block;height:7px;border-radius:2px}
ol.steps{margin:2px 0 9px;padding-left:0;list-style:none;counter-reset:s}
ol.steps li{counter-increment:s;position:relative;padding:5px 0 5px 26px;border-bottom:1px solid #EDEDF5}
ol.steps li:last-child{border-bottom:0}
ol.steps li::before{content:counter(s) ".";position:absolute;left:0;top:5px;font-weight:700;color:#000091}
.cal{border-left:3px solid #000091;background:#F5F5FE;padding:7px 12px;margin:4px 0 9px;font-size:9.5px;border-radius:0 4px 4px 0}
.src{font-size:8px;color:#9AA3B5;margin-top:10px}
.foot{margin-top:16px;border-top:1px solid #D8D8E8;padding-top:6px;font-size:7.5px;color:#9AA3B5;display:flex;justify-content:space-between}
`;

const PRINT_SCRIPT = `<script>window.addEventListener("load",function(){var go=function(){try{window.focus();window.print();}catch(e){}};(document.fonts&&document.fonts.ready)?document.fonts.ready.then(function(){setTimeout(go,150);}):setTimeout(go,400);});</script>`;

function openPrintable(opts: { docTitle: string; docRef: string; bodyHtml: string }) {
  const dateStr = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // Le document est ouvert via une URL blob: → les chemins racine (/fonts, /logos) ne se
  // résolvent pas tout seuls. On fixe la base sur l'origine du dashboard.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const html =
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
    `<base href="${esc(origin)}/">` +
    `<title>${esc(opts.docTitle)} — RF Intelligence Maritime</title><style>${SHELL_CSS}</style></head><body>` +
    `<div class="toolbar no-print"><span>Document prêt — cliquez « Imprimer » puis choisissez « Enregistrer au format PDF ».</span>` +
    `<button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>` +
    `<div class="sheet">` +
    `<div class="gov">` +
    `<div class="id"><div class="mb"><div class="rf">RÉPUBLIQUE<br>FRANÇAISE</div><div class="dev">Liberté · Égalité · Fraternité</div></div>` +
    `<img class="logo" src="/logos/marine-nationale.png" alt="Marine nationale"></div>` +
    `<div class="dt"><div class="t">${esc(opts.docTitle)}</div>` +
    `<div class="s">RF Intelligence Maritime — identification passive &amp; détection d'anomalies maritimes</div>` +
    `<div class="r">${esc(opts.docRef)}</div></div></div>` +
    `<div class="meta"><span>Édité le <b>${esc(dateStr)}</b></span>` +
    `<span>Zone d'intérêt : <b>Méditerranée occidentale (exercice)</b></span>` +
    `<span>Sources : <b>capteurs RF + AIS + registres OSINT</b></span>` +
    `<span class="classif">DOCUMENT D'EXERCICE — DONNÉES SYNTHÉTIQUES</span></div>` +
    opts.bodyHtml +
    `<div class="foot"><span>Plateforme RF Intelligence Maritime — Hackathon Albert School 2026 / Ministère des Armées</span>` +
    `<span>Document généré automatiquement le ${esc(dateStr)}</span></div>` +
    `</div>${PRINT_SCRIPT}</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Fiche d'alerte d'une anomalie (vue imprimable A4, charte DSFR). */
export function generateAnomalyAlertPdf(anomaly: Anomaly, recommendations: string[]) {
  const sev = SEV_HEX[anomaly.severity] ?? "#1E2232";
  const detectedAt = new Date(anomaly.timestamp).toLocaleString("fr-FR");
  const body =
    `<div class="band" style="border-left-color:${sev}">` +
    `<div><div class="l">Type d'anomalie</div><div class="v">${esc(anomaly.type)}</div></div>` +
    `<div><div class="l">Sévérité</div><div class="v" style="color:${sev}">${esc(anomaly.severity.toUpperCase())}</div></div>` +
    `<div><div class="l">Indice de confiance</div><div class="v" style="color:${sev}">${pct(anomaly.confidence)} %</div></div>` +
    `<div><div class="l">Détectée le</div><div class="v">${esc(detectedAt)}</div></div></div>` +
    `<h2>Bâtiment concerné</h2>` +
    `<table class="kv"><tbody>` +
    `<tr><td class="k">Nom</td><td>${esc(anomaly.vesselName || "—")}</td><td class="k">MMSI</td><td>${esc(fmtMmsi(anomaly.mmsi))}</td></tr>` +
    `<tr><td class="k">Position</td><td>${anomaly.lat.toFixed(3)} N, ${anomaly.lon.toFixed(3)} E</td><td class="k">Source de détection</td><td>${esc(anomaly.source)}</td></tr>` +
    `</tbody></table>` +
    `<h2>Constat</h2><p>${esc(anomaly.description)}</p>` +
    `<h2>Chaîne d'analyse &amp; actions recommandées</h2>` +
    `<ol class="steps">${recommendations.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>` +
    `<h2>Suite donnée</h2>` +
    `<table class="kv"><tbody>` +
    `<tr><td class="k">Décision</td><td colspan="3">☐ Escalade CO-MAR&nbsp;&nbsp;&nbsp;&nbsp;☐ Demande d'overpass satellite&nbsp;&nbsp;&nbsp;&nbsp;☐ Marqué faux positif&nbsp;&nbsp;&nbsp;&nbsp;☐ Surveillance maintenue</td></tr>` +
    `<tr><td class="k">Analyste</td><td>&nbsp;</td><td class="k">Date / heure</td><td>&nbsp;</td></tr>` +
    `<tr><td class="k">Observations</td><td colspan="3" style="height:34px">&nbsp;</td></tr>` +
    `</tbody></table>` +
    `<p class="src">Détection produite automatiquement par la plateforme RF Intelligence Maritime — corroborée contre la table de vérité terrain <i>anomalies_large.csv</i>. Document d'exercice (données synthétiques), non opposable en l'état.</p>`;

  openPrintable({ docTitle: "FICHE D'ALERTE", docRef: `Réf. ${anomaly.id}`, bodyHtml: body });
}

/** Rapport de détection — synthèse : périmètre, méthode, détections, évaluation vs vérité terrain. */
export function generateDetectionReportPdf(opts: { kpis: Kpis; recallByType: RecallRow[] }) {
  const k = opts.kpis;
  const recallRows = opts.recallByType
    .map((r) => {
      const c = recallColor(r);
      return (
        `<tr><td>${esc(r.type)}</td><td class="num">${r.nTruth}</td><td class="num">${r.nOverlap}</td>` +
        `<td class="bar"><span class="track"><span class="fill" style="width:${Math.max(r.recall * 100, 1.5)}%;background:${c}"></span></span>` +
        `<b style="color:${c}">${pct(r.recall)} %</b></td>` +
        `<td class="note">${esc(r.note || (r.recoverable ? "" : "non récupérable des tables"))}</td></tr>`
      );
    })
    .join("");

  const body =
    `<h2>1 — Contexte &amp; problématique</h2>` +
    `<p>En zone maritime sensible, une fraction croissante de bâtiments désactive, falsifie ou manipule son AIS : extinction volontaire, MMSI usurpé, faux pavillon, changement d'identité en mer. Ces pratiques structurent le contournement des sanctions, le trafic illicite et la projection grise de puissances rivales jusqu'à nos approches. La présente plateforme exploite une voie complémentaire et <b>passive</b> — la signature électromagnétique du navire (émissions VHF, radar de navigation, liaisons satcom, équipements de pont), agrégée en une empreinte radio par bâtiment — pour <b>identifier</b>, <b>localiser</b> et <b>qualifier</b> un navire qui refuse de coopérer.</p>` +
    `<h2>2 — Périmètre analysé &amp; méthode</h2>` +
    `<div class="grid">` +
    `<div class="stat"><div class="v">${fr(k.nShips)}</div><div class="l">Navires au registre</div></div>` +
    `<div class="stat"><div class="v">${fr(k.nProfiled)}</div><div class="l">Navires profilés (signature RF)</div></div>` +
    `<div class="stat"><div class="v">${fr(k.nSignatures)}</div><div class="l">Signatures RF analysées</div></div>` +
    `<div class="stat"><div class="v">${fr(k.nAnomaliesTruth)}</div><div class="l">Anomalies de référence (vérité terrain)</div></div></div>` +
    `<p><b>Chaîne de traitement.</b> (1) Agrégation des ${fr(k.nSignatures)} signatures par MMSI → base de profils <i>ship_radio_profiles.csv</i> : moyennes et écarts-types de fréquence, bande passante, puissance, SNR ; modulation et motif d'impulsion dominants. (2) Modélisation des familles d'émetteurs par <b>K-Means</b> (K = ${k.kmeansK}, normalisation StandardScaler ; score de silhouette ${k.silhouette.toFixed(2)} — familles peu séparées sur ce jeu synthétique, ce que nous documentons explicitement). (3) <b>Pipeline d'identification passive</b> : une signature captée est appariée à la base par plus-proches-voisins, restituant les candidats les plus probables avec un score de confiance, puis vérifiée contre le registre. (4) Détection d'anomalies multi-règles et <b>score de suspicion multi-facteurs</b> (règles statistiques, IsolationForest / LOF, zones, croisement OSINT). ${fr(k.nSilentShips)} navires n'émettent aucune signature radio — « jamais entendus », dont ${fr(k.nSilentSuspicious)} déjà marqués suspects : un signal de suspicion en soi.</p>` +
    `<h2>3 — Détections automatiques</h2>` +
    `<table><thead><tr><th>Typologie</th><th>Méthode</th><th style="text-align:right">Volume détecté</th></tr></thead><tbody>` +
    `<tr><td>AIS désactivé &gt; 24 h</td><td class="note">coupure dans la trace AIS, triée par MMSI puis horodatage</td><td class="num"><b>${fr(k.nAisOffBlocks)}</b> épisodes / <b>${fr(k.nAisOffMmsi)}</b> navires</td></tr>` +
    `<tr><td>Écart position AIS ↔ RF &gt; 1 km</td><td class="note">position déclarée vs position triangulée par path-loss</td><td class="num"><b>${fr(k.nPosMismatchPairs)}</b> paires / <b>${fr(k.nPosMismatchMmsi)}</b> navires</td></tr>` +
    `<tr><td>MMSI orphelin</td><td class="note">signature radio sans navire correspondant au registre</td><td class="num"><b>${fr(k.nOrphans)}</b> — intégrité référentielle complète</td></tr>` +
    `<tr><td>Faux pavillon — candidats</td><td class="note">distance de Mahalanobis multivariée au profil-pays</td><td class="num"><b>${fr(k.nFakeFlagFlagged)}</b></td></tr>` +
    `<tr><td>Changement de nom répété — candidats</td><td class="note">plus de 2 noms historiques (pattern d'identity laundering)</td><td class="num"><b>${fr(k.nNameChangeFlagged)}</b></td></tr>` +
    `</tbody></table>` +
    `<h2>4 — Évaluation vs vérité terrain (anomalies_large.csv)</h2>` +
    `<p class="tight">Le rappel mesure la part des ${fr(k.nAnomaliesTruth)} anomalies de référence retrouvée par nos détecteurs à partir des données structurées. L'analyse initiale concluait à un <b>plafond théorique de ${pct(k.achievableRecallCeilingBefore)} %</b> (${fr(k.nUnrecoverableBefore)} anomalies Speed / Course renseignées uniquement en texte libre, vitesse plafonnée à 30 nœuds dans la colonne <i>ais.speed</i>). En reconstituant la <b>vitesse implicite</b> par distance géodésique entre positions AIS consécutives, et le <b>Δcap</b> entre points avec gestion du wraparound 0/360°, ces anomalies redeviennent récupérables des tables : <b>plafond porté à ${pct(k.achievableRecallCeiling)} %</b>, <b>rappel global passé de ${pct(k.recallOverallBefore)} % à ${pct(k.recallOverall)} %</b> (+ ${fr(k.nRecoveredKinematic)} anomalies cinématiques retrouvées).</p>` +
    `<table><thead><tr><th>Type d'anomalie</th><th style="text-align:right">Réf.</th><th style="text-align:right">Retrouvées</th><th>Rappel</th><th>Remarque</th></tr></thead><tbody>${recallRows}</tbody></table>` +
    `<div class="cal"><b>Score de suspicion multi-facteurs :</b> AUC ${k.scoreAuc.toFixed(2)} · précision@k ${pct(k.scorePrecisionAtK)} %. Sur ce jeu synthétique, les détecteurs non-supervisés se situent près du hasard (corrélations ≈ 0, fréquences par pavillon indiscernables) — la performance brute n'est pas l'objet : le livrable est la <b>méthode</b> et la chaîne de bout en bout.</div>` +
    `<h2>5 — Limites &amp; perspectives</h2>` +
    `<p>Les données mises à disposition pour l'exercice sont <b>synthétiques et volontairement peu discriminantes</b> : le taux d'identification correcte sur un tirage aléatoire de signatures est quasi nul, et nous l'assumons. Sur de vraies captures — résolution sub-MHz, harmoniques, dérive d'oscillateur, signature transitoire à l'allumage — l'empreinte porte beaucoup plus d'information, et le même pipeline devient opérant. L'architecture est dimensionnée pour le passage à l'échelle : intégration aux capteurs existants, branchement OSINT (Equasis, listes OFAC / UE, registres UIT), génération automatique de fiches d'alerte, extension Atlantique et Indo-Pacifique.</p>`;

  openPrintable({ docTitle: "RAPPORT DE DÉTECTION", docRef: "Synthèse opérationnelle", bodyHtml: body });
}
