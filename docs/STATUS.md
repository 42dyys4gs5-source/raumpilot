# Entwicklungsstand

Stand: Oktober 2026 · Branch `claude/raumpilot-saas-platform-xc7tge`

## Fertig und getestet

- Datenmodell mit Migrationen (Drizzle), inkl. Exclusion-Constraint gegen Doppelbuchungen.
- Authentifizierung: Registrierung, E-Mail-Bestätigung, Login mit Sperre, Passwort-Reset, Passwort ändern, TOTP-2FA (Pflicht für Admins), Einladungen, Rollen.
- Buchungs-Engine: Verfügbarkeit, Preise, Regeln, Extras, Rabattcodes, Kaution, Sofortbuchung/Anfrage, Haltefristen, Ablauf, Zahlung, verspätete Zahlung, Stornierung mit Rückerstattung, Umbuchung, Erinnerungen, manuelle Buchungen.
- Stripe Billing + Connect inkl. idempotenter Webhooks (gegen Stripe-Signaturen getestet; End-to-End mit Test-Gateway).
- Kalender: Monat/Woche/Tag, Sperrzeiten, Ferien, iCal-Export, iCal-Import mit Wiederholungen/Zeitzonen und Konfliktmeldung.
- E-Mail-System mit 25+ Vorlagen, Job-Queue mit Wiederholungen und Duplikatschutz, Willkommensserie.
- Vollständige Website, Vermieter-Dashboard (alle 15 Menüpunkte), Admin-Bereich, öffentliche Buchungsseite, Widget, QR-Codes, Raumverzeichnis.
- Sicherheit (siehe SICHERHEIT.md), SEO (Sitemap, robots, Canonicals, strukturierte Daten, OG-Bild), Datenexport, Kontolöschung.
- CI-Workflow, Cron- und Backup-Workflows, Betriebsdokumentation.

## Bewusst noch nicht umgesetzt / Grenzen

| Thema | Stand | Nächster Schritt |
|---|---|---|
| Live-Zahlungen | Code fertig, gegen Stripe-Signaturen und Test-Gateway getestet; **nicht gegen echte Stripe-API** getestet (keine Zugangsdaten) | Mit Stripe-Testschlüsseln Ablauf gemäss OFFENE-PUNKTE §D prüfen |
| TWINT | Über dynamische Zahlungsmethoden + Capability-Anfrage vorbereitet | Mit echtem CH-Connect-Konto verifizieren |
| Google/Outlook direkt (OAuth) | Nicht umgesetzt; iCal-Import/Export funktioniert | OAuth-Apps registrieren (Google-Verifizierung nötig), Tabelle `calendar_connections` ergänzen |
| Mehrsprachigkeit FR/IT/EN | Architektur vorbereitet (Inhalte gebündelt, zentrale Formatierung), nur Deutsch umgesetzt | Locale-Routing + Übersetzung von `src/content`, E-Mail-Vorlagen, UI-Texten |
| Serienbuchungen, Anzahlungen | Nicht umgesetzt (auf Website als «in Vorbereitung» gekennzeichnet) | |
| Buchungsprovision | Technisch vorhanden (`PLATFORM_FEE_BPS`, Standard 0) | Bei Bedarf aktivieren und in AGB/Preisen ausweisen |
| KI-Supportassistent | Nicht umgesetzt (optional) | Nur mit freigegebener Wissensbasis, ohne Aktionen |
| Row-Level-Security | Isolation in der Anwendung (getestet) | Optional RLS als zusätzliche Schicht |
| Bildvorschau-Galerie | Statische Galerie (bis 5 Bilder sichtbar) | Lightbox für alle Fotos |
| Next.js 16 | Läuft auf Next.js 15.5 (unterstützt) | Upgrade (behebt PostCSS-Audit-Meldung) |

## Nützliche Befehle

```bash
npm run dev | build | start
npm run db:generate      # Migration aus Schemaänderung erzeugen
npm run db:migrate       # Migrationen ausführen
npm run db:seed-plans    # Standardtarife anlegen (bestehende Admin-Änderungen bleiben)
npm run admin:create -- e-mail "Name"
npm run jobs:run         # Hintergrundjobs manuell ausführen
npm test | npm run test:e2e
```
