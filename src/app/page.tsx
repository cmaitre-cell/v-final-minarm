"use client";

import { useEffect, useState } from "react";
import { TabKey } from "@/components/TopBar";
import { HeaderGouv } from "@/components/HeaderGouv";
import { FooterGouv } from "@/components/FooterGouv";
import { SyntheseView } from "@/components/SyntheseView";
import { IdentificationView } from "@/components/IdentificationView";
import { LocalisationView } from "@/components/LocalisationView";
import { AnomaliesView } from "@/components/AnomaliesView";
import { GraphView } from "@/components/GraphView";

export default function Home() {
  const [tab, setTab] = useState<TabKey>("synthese");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      setClock(
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#ffffff" }}>
      <HeaderGouv active={tab} onChange={setTab} clock={clock} />

      <main style={{ flex: 1 }}>
        {tab === "synthese"       && <SyntheseView onJumpToAnomaly={() => setTab("anomalies")} />}
        {tab === "identification" && <IdentificationView />}
        {tab === "localisation"   && <LocalisationView />}
        {tab === "anomalies"      && <AnomaliesView />}
        {tab === "graph"          && <GraphView />}
      </main>

      <FooterGouv />
    </div>
  );
}
