# Architektur

## Stack und Begründung

| Bereich | Wahl | Begründung |
|---|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict | Server Components + Server Actions: wenig Client-JS, schnelle Seiten, gutes SEO |
| UI | Tailwind CSS 4, eigene Komponenten im shadcn/ui-Stil, lucide-Icons | Keine schwere UI-Bibliothek; volle Kontrolle über Barrierefreiheit |
| Datenbank | PostgreSQL (Supabase empfohlen) via Drizzle ORM + postgres.js | Transaktionen, Exclusion-Constraints, portabel (jede Postgres-Instanz) |
| Auth | Eigene Implementierung (scrypt, DB-Sessions, TOTP) | Keine Abhängigkeit, volle Kontrolle über Admin-2FA und Sessions; testbar ohne externe Dienste |
| Zahlungen | Stripe Billing (Abos) + Stripe Connect (Direct Charges) | Vermieter ist Zahlungsempfänger, Raumvia nicht Merchant of Record |
| E-Mail | Resend (HTTP-API mit Idempotency-Key) | Einfach, zuverlässig; Vorlagen als typisierte Funktionen |
| Jobs | Eigene Postgres-Queue (Transactional Outbox, `SKIP LOCKED`, Backoff, Dedupe-Keys) | Keine zusätzliche Infrastruktur; garantiert «genau ein» Versand pro Ereignis |
| Dateien | Supabase Storage (Produktion) / lokal (Entwicklung), Bildoptimierung mit sharp | Bilder werden validiert, rotiert, Metadaten entfernt, als WebP gespeichert |
| Kalender | ical.js für Import, eigener RFC-5545-Export | Wiederholungen/Zeitzonen korrekt; SSRF-geschützter Abruf |
| Tests | Vitest (Unit + Integration gegen echte DB), Playwright (E2E gegen Produktions-Build) | |

Supabase wird bewusst nur als PostgreSQL- und Speicher-Anbieter genutzt, nicht für Auth oder die öffentliche Daten-API. Dadurch ist die App an jede PostgreSQL-Instanz übertragbar (z. B. Schweizer Hoster).

## Verzeichnisstruktur

```
src/
  app/
    (marketing)/       Öffentliche Website, Lösungen, Preise, FAQ, Hilfe, Recht, Raumverzeichnis
    (auth)/            Login, 2FA, Registrierung, Passwort, E-Mail-Bestätigung, Einladung
    app/(main)/        Vermieter-Dashboard (jeder Bereich: page.tsx + actions.ts)
    app/onboarding/    Einrichtungsassistent
    admin/             Plattform-Administration (nur mit 2FA)
    r/[slug]           Öffentliche Raumseite mit Buchungsformular
    v/[slug]           Öffentliche Vermieterseite
    embed/[slug]       Einbettbares Buchungswidget (iframe)
    buchung/[token]    Kundenansicht: Status, Zahlung, Storno, Umbuchung, Beleg
    api/               availability, quote, bookings, webhooks, cron, ical, qr, export, health
    dev/checkout       Test-Zahlungsseite (nur PAYMENTS_MODE=fake, in Produktion gesperrt)
  lib/
    booking/           availability (rein), pricing (rein), policy (rein), engine (DB), notify, links
    billing/           Tarife/Berechtigungen, Abo-Synchronisation
    payments/          Gateway-Abstraktion, Stripe, Webhook-Verarbeitung
    calendar/          iCal Import/Export, SSRF-sicherer Abruf, Synchronisation
    jobs/              Queue, Worker, Periodik
    email/             Layout, Vorlagen, Versand
    auth/ security/    Passwörter, Sessions, Tokens, TOTP, Rate-Limit, Audit, Krypto, Fehler
  content/             Texte (Branchen, FAQ, Hilfe, Rechtsvorlagen) – Basis für spätere Übersetzungen
  config/              Marke und Tarife (zentral konfigurierbar)
drizzle/               SQL-Migrationen (inkl. Exclusion-Constraint)
tests/                 unit, integration, e2e
```

## Mandantentrennung (Multi-Tenant)

- Jede fachliche Tabelle trägt `org_id`. Alle Dashboard-Seiten und Server Actions holen den Kontext über `requireOrg()` und filtern **jede** Abfrage nach `ctx.org.id` (z. B. `getOrgRoom(orgId, roomId)`).
- Rollen: `owner` > `admin` > `staff`; `requireOrg("admin")` erzwingt Mindestrollen serverseitig.
- Öffentliche Endpunkte (Verfügbarkeit, Buchung) arbeiten nur mit veröffentlichten Räumen aktiver Konten und geben keine Kundendaten preis.
- Tests: `tests/integration/platform.test.ts` (Isolation), `booking-engine.test.ts` (fremde Mandanten können nicht buchen/stornieren), `e2e/security.spec.ts` (HTTP-Ebene: 404 auf fremde Räume/QR-Codes).

## Buchungslogik

1. **Verfügbarkeit** (`availability.ts`, rein funktional): Öffnungsfenster werden in Wandzeit der Raum-Zeitzone definiert (bis 48 h, also über Mitternacht) und mit Luxon in UTC umgerechnet → Sommer-/Winterzeit korrekt. Benachbarte Fenster werden zu durchgehenden Perioden verschmolzen (Mehrtagesbuchungen).
2. **Belegung**: Eine Buchung belegt `[start − Vorbereitung, ende + Reinigung)`; gespeichert als `tstzrange` in `bookings.occupied`.
3. **Doppelbuchungsschutz** in zwei Schichten:
   - `SELECT … FOR UPDATE` auf die Raumzeile serialisiert alle Buchungen eines Raums (inkl. Ablauf alter Reservationen, Sperrzeiten-Prüfung, Preisberechnung).
   - `EXCLUDE USING gist (room_id WITH =, occupied WITH &&) WHERE status IN (aktive)` garantiert auf Datenbankebene, dass sich aktive Buchungen nie überschneiden – selbst wenn Anwendungsprüfungen umgangen würden. Test: 20 parallele Buchungsversuche → genau 1 Erfolg.
4. **Status**: `requested` → `awaiting_payment` → `confirmed`; `pending_payment` (Sofortbuchung mit Onlinezahlung, 35 Min. Haltefrist; Stripe-Session 31 Min.); Endzustände `cancelled`, `declined`, `expired`. Abgelaufene Reservationen werden bei jeder Buchung des Raums und periodisch freigegeben.
5. **Verspätete Zahlung**: Trifft eine Zahlung nach Ablauf ein, wird die Buchung reaktiviert, falls frei – sonst automatisch vollständig erstattet und der Kunde informiert.
6. **Preise** (`pricing.ts`): günstigster von Stunden- (5-Minuten-Segmente mit Regel-Faktoren), Halbtages-, Tages- und Mehrtagespreis; Zusatzleistungen; Rabattcode (atomar gezählt); Kaution; 5-Rappen-Rundung; MWST-Ausweis.
7. **Stornierung** (`policy.ts`): Rückerstattung nach Raumregeln; Vermieter-Storno immer 100 %; Kaution immer zurück. Rückerstattungen werden als «pending» verbucht und idempotent bei Stripe ausgeführt (Idempotency-Key pro Rückerstattung), mit Wiederholung im Dashboard.

## Zahlungsflüsse

- **Abo**: `startSubscriptionCheckout` → Stripe Checkout (Abo, optionale Testphase nur beim ersten Abo) → Webhooks `customer.subscription.*` synchronisieren Tarif/Status in `subscriptions` und `organizations`; `invoice.*` → `invoices` + E-Mails. Tarifwechsel/Kündigung über das Stripe-Kundenportal. Zugriff: `active`, `trialing`, `past_due` (Kulanzfrist während Smart Retries).
- **Mietzahlung**: Checkout-Session auf dem verbundenen Konto (`stripeAccount`-Header, Direct Charge, optional `application_fee_amount`). Webhook prüft, dass das Ereignis vom Konto des Vermieters stammt.
- **Idempotenz**: `stripe_events` (Ereignis-ID, Claim mit `locked_at`), eindeutige `payments(kind, external_id)`, Dedupe-Keys für E-Mail-Jobs.
- **Gateway-Abstraktion**: `PaymentGateway` mit Stripe-Implementierung und einer Test-Implementierung, die synthetische Ereignisse durch denselben Webhook-Code leitet (nur für E2E-Tests).

## Hintergrundprozesse

`/api/cron/run` (alle 5 Min.) plant periodische Jobs (Ablauf, Erinnerungen, iCal-Sync alle 30 Min., tägliche Systemprüfung, Monatsbericht) und arbeitet fällige Jobs ab. Zusätzlich werden Jobs direkt nach einer Anfrage via `after()` verarbeitet, damit E-Mails sofort rausgehen.

## Internationalisierung

Alle Texte sind derzeit Deutsch (Schweiz). Inhalte sind in `src/content/*` und `src/lib/email/templates.ts` gebündelt, Datums-/Zahlenformate laufen über zentrale Helfer (`lib/utils/dates.ts`, `money.ts`) und `users.locale` existiert. Für FR/IT/EN: Inhalte pro Sprache duplizieren und eine Locale-Auflösung (Pfadpräfix `/fr` …) ergänzen – siehe STATUS.md.
