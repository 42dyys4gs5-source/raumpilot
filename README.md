# Raumvia

Schweizer SaaS-Buchungssoftware für Vermieterinnen und Vermieter von Event-, Party-, Seminar- und Proberäumen, Fotostudios, Sitzungszimmern sowie Tanz- und Yogastudios.

> **Name:** Ursprünglich als «RaumPilot» geplant. `raumpilot.ch` ist seit 2012 registriert und leitet auf die Raumpiloten GmbH (Architektur/Immobilien) weiter – deshalb wurde der Name auf **Raumvia** geändert. `raumvia.ch`, `raumvia.swiss`, `raumvia.com` und `raumvia.de` waren bei der Prüfung (Oktober 2026, RDAP-Abfrage) frei. Der Name ist zentral in `src/config/brand.ts` konfigurierbar. Eine Markenprüfung (Swissreg/IGE) steht noch aus – siehe [docs/OFFENE-PUNKTE.md](docs/OFFENE-PUNKTE.md).

## Was die Software kann

- **Öffentliche Website** mit Startseite, Funktionen, sieben Branchen-Landingpages, Preisen, «So funktioniert's», FAQ, Kontakt, Wissensdatenbank, Raumverzeichnis (Opt-in) und Rechtsvorlagen.
- **Vermieterkonto**: Registrierung, E-Mail-Bestätigung, Passwort-Reset, Zwei-Faktor-Login (optional), Einrichtungsassistent, Willkommens-E-Mail-Serie.
- **Dashboard**: Übersicht, Räume (Fotos, Preise, Zeiten, Regeln, Veröffentlichung), Kalender (Monat/Woche/Tag), Buchungen (annehmen, ablehnen, verschieben, stornieren, Rückerstattung, als bezahlt markieren, manuell erfassen), Kunden, Zahlungen & Einnahmen (Stripe Connect, Statistiken, CSV), Preisregeln, Zusatzleistungen, Verfügbarkeit (Sperrzeiten, Ferien, iCal-Import/-Export), Gutscheine, Buchungsseite mit QR-Code und Website-Widget, Benachrichtigungen, Einstellungen (Firma/MWST, Team, Standorte, Sicherheit, Datenexport, Kontolöschung), Abonnement, Support.
- **Buchungssystem**: Echtzeit-Verfügbarkeit, keine Doppelbuchungen (Datenbank-Exclusion-Constraint + Zeilensperre), Puffer, Mindestvorlauf, Buchungen über Mitternacht, Sommer-/Winterzeit, Stunden-/Halbtages-/Tages-/Mehrtagespreise, Wochenend- und Saisonregeln, Zusatzleistungen, Rabattcodes, Kaution, Sofortbuchung oder Anfrage, Reservationsfrist während der Zahlung, Stornierung mit automatischer Rückerstattung, Umbuchung.
- **Zahlungen**: Stripe Billing für Abos (Checkout, Kundenportal, Upgrades/Downgrades, Kündigung zum Laufzeitende, Rechnungen, fehlgeschlagene Zahlungen), Stripe Connect (Direct Charges auf dem Konto des Vermieters, Karte und – falls aktiviert – TWINT), idempotente Webhooks.
- **Automatisierung**: Job-Queue mit Wiederholungen, E-Mails (Resend), Erinnerungen, Verfall von Reservationen/Anfragen, Kalendersynchronisation, tägliche Systemprüfung, Monatsbericht, Backup-Überwachung.
- **Administration**: MRR, aktive Abos, Umsatz, Neukunden, Kündigungen, fehlgeschlagene Zahlungen, Buchungsvolumen, neue Räume, Fehler, Support, E-Mail-Protokoll, Sicherheitsereignisse, Jobs, Tarife, Betreiberangaben, Konten sperren, manuelle Freischaltungen. Zugang nur mit Zwei-Faktor-Authentifizierung.

## Schnellstart (lokal)

Voraussetzungen: Node.js ≥ 20.18, PostgreSQL ≥ 14 mit den Erweiterungen `citext`, `btree_gist`, `pgcrypto`.

```bash
npm install
cp .env.example .env.local          # Werte anpassen (siehe Kommentare)
createdb raumpilot_dev               # bzw. eigene Datenbank
psql raumpilot_dev -c "create extension citext; create extension btree_gist; create extension pgcrypto;"
npm run db:migrate
npm run db:seed-plans
npm run admin:create -- sie@example.ch "Ihr Name"
npm run dev                          # http://localhost:3000
```

Ohne Stripe-Schlüssel läuft die Anwendung mit `PAYMENTS_MODE=disabled`: Vermieter rechnen per Rechnung/vor Ort ab, und Abos können im Admin-Bereich manuell freigeschaltet werden (z. B. für Pilotkunden).

## Tests

```bash
npm run typecheck && npm run lint
npm test               # Unit- und Integrationstests (benötigt Test-Datenbank, siehe vitest.config.ts)
npm run build
npm run test:e2e       # Playwright gegen den Produktions-Build (Test-Zahlungsmodus, siehe docs/TESTS.md)
```

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/STATUS.md](docs/STATUS.md) | Entwicklungsstand, bekannte Grenzen, nächste Aufgaben |
| [docs/OFFENE-PUNKTE.md](docs/OFFENE-PUNKTE.md) | **Was Sie noch tun bzw. freigeben müssen** (Zugänge, Domain, Recht) |
| [docs/BETRIEB.md](docs/BETRIEB.md) | Produktivsetzung, Stripe/Resend/Supabase/Vercel, DNS, Cron, Backups, Wiederherstellung |
| [docs/KOSTEN.md](docs/KOSTEN.md) | Laufende monatliche Betriebskosten |
| [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) | Technischer Aufbau, Datenmodell, Buchungslogik |
| [docs/SICHERHEIT.md](docs/SICHERHEIT.md) | Sicherheits- und Datenschutzmassnahmen |
| [docs/TESTS.md](docs/TESTS.md) | Teststrategie und tatsächliche Testergebnisse |
