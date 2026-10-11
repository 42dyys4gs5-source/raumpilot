import { ImageResponse } from "next/og";

export const alt = "Raumvia – Buchungssoftware für Raumvermietung";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#0f5c4d,#0a3a31)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44, fontWeight: 700 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "white", color: "#0f5c4d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>R</div>
          Raumvia
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>Ihr Raum. Online buchbar.</div>
          <div style={{ fontSize: 32, marginTop: 20, color: "#d5ece5" }}>Buchungsseite · Echtzeit-Kalender · TWINT & Karte · Automatische Bestätigungen</div>
        </div>
        <div style={{ fontSize: 26, color: "#eeb75c" }}>raumvia.ch</div>
      </div>
    ),
    size,
  );
}
