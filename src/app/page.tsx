"use client";

import { useEffect, useState } from "react";
import { TabKey } from "@/components/TopBar";
import { HeaderGouv } from "@/components/HeaderGouv";
import { FooterGouv } from "@/components/FooterGouv";
import { SyntheseView } from "@/components/SyntheseView";
import { IdentificationView } from "@/components/IdentificationView";
import { LocalisationView } from "@/components/LocalisationView";
import { AnomaliesView } from "@/components/AnomaliesView";

export default function Home() {
  const [tab, setTab] = useState<TabKey>("synthese");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Europe/Paris",
    });
    const update = () => setClock(fmt.format(new Date()));
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
      </main>

      <FooterGouv />
    </div>
  );
}
