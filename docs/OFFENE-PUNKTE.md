# Offene Punkte – was Sie noch tun oder freigeben müssen

Die Software ist entwickelt und getestet. Für den Livegang fehlen Zugänge, Freigaben und Angaben, die nur Sie liefern können. Ich habe **nichts gekauft, keine Konten eröffnet und keine Zugangsdaten erfunden**.

## A. Entscheidungen und Käufe (Ihre Freigabe nötig)

| # | Punkt | Was zu tun ist |
|---|---|---|
| A1 | **Name & Domain** | ✅ `raumvia.ch` registriert, Adresse info@raumvia.ch. Optional zusätzlich `raumvia.com`. |
| A2 | **Markenprüfung** | Vorabrecherche erledigt: keine Treffer in Swissreg und Zefix (siehe MARKENPRUEFUNG.md). Empfohlen: Marke beim IGE anmelden (ab CHF 550). |
| A3 | Hosting-Plan | Vercel Pro (ca. USD 20/Monat) – gewerbliche Nutzung erfordert Pro. |
| A4 | Datenbank-Plan | Supabase Pro (ca. USD 25/Monat), Region Zürich/EU. |
| A5 | E-Mail | Resend-Konto (Free reicht für den Start). |

## B. Zugänge, die Sie anlegen und mir bzw. in Vercel hinterlegen müssen

| # | Zugang | Variable(n) | Anleitung |
|---|---|---|---|
| B1 | Supabase Datenbank + Storage | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | BETRIEB.md §1–2 |
| B2 | Resend + DNS-Einträge (SPF/DKIM) | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_MODE=resend` | BETRIEB.md §3 |
| B3 | Stripe-Plattformkonto (Firma, Schweiz), Produkte/Preise, Kundenportal, Webhook | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Preis-IDs im Admin | BETRIEB.md §5.1 |
| B4 | Stripe Connect aktivieren + Connect-Webhook | `STRIPE_CONNECT_WEBHOOK_SECRET`, `PAYMENTS_MODE=stripe` | BETRIEB.md §5.2 |
| B5 | Vercel-Projekt + Domain/DNS | alle Variablen aus `.env.example` | BETRIEB.md §4, §6 |
| B6 | Geheimnisse erzeugen | `APP_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` | `openssl rand …` (BETRIEB.md §4) |
| B7 | Ihre Admin-E-Mail | `ADMIN_ALERT_EMAIL`; `npm run admin:create -- …` | |
| B8 | Optional: Sentry, Cloudflare Turnstile, GitHub-Backup-Secrets | `SENTRY_DSN`, `TURNSTILE_*`, `BACKUP_PASSPHRASE` | BETRIEB.md §7–8 |

## C. Rechtliches (Fachperson nötig)

| # | Punkt |
|---|---|
| C1 | **Betreiberangaben** im Admin-Bereich ergänzen (Firma, Rechtsform, Adresse, UID, vertretungsberechtigte Person). Ohne diese zeigen Impressum/Datenschutz/AGB «[Angabe fehlt]». |
| C2 | **Prüfung aller Rechtsvorlagen** (Impressum, Datenschutzerklärung, AGB, Nutzungsbedingungen, Auftragsbearbeitung, Vorlage Stornierungsbedingungen) durch eine Anwältin/einen Anwalt. Sie sind auf den Seiten deutlich als Entwurf markiert – Hinweis nach der Prüfung in `src/app/(marketing)/rechtliches/[slug]/page.tsx` entfernen. |
| C3 | Unterauftragsbearbeiter und Datenübermittlung ins Ausland (Vercel, Resend: USA) in der Datenschutzerklärung finalisieren; Auftragsverarbeitungsverträge (DPA) mit Vercel, Supabase, Resend, Stripe abschliessen (meist online akzeptierbar). |
| C4 | MWST: Klären, ab wann Sie MWST-pflichtig sind (CHF 100’000 Umsatz) und Einstellung im Admin setzen. |
| C5 | Stripe-Plattformvertrag/Connect-Nutzungsbedingungen akzeptieren; prüfen, dass das Geschäftsmodell (Software für Vermieter, Direct Charges) von Stripe genehmigt ist. |

## D. Verifizierung nach Einrichtung der Zugänge

1. Im **Stripe-Testmodus**: Registrierung → Tarif mit Testkarte `4242 4242 4242 4242` abschliessen → Webhook-Eingang im Admin (System) prüfen.
2. Testvermieter: Stripe Connect verbinden (Testdaten), Raum auf «Online bei Buchung» stellen, Testbuchung bezahlen, stornieren → Rückerstattung im Stripe-Dashboard sichtbar.
3. **TWINT**: Auf einem echten (Live-)Connect-Konto in der Schweiz TWINT aktivieren und eine Kleinstbuchung (z. B. CHF 1.–) testen. Die Integration nutzt dynamische Zahlungsmethoden; die tatsächliche Verfügbarkeit hängt von Stripe und dem Vermieterkonto ab und konnte ohne Live-Zugang nicht verifiziert werden.
4. E-Mail-Zustellung (Spam-Test, z. B. mail-tester.com).
5. Erst danach Live-Schlüssel setzen. Der Admin zeigt «Stripe LIVE» bzw. «Testmodus».

## E. Was ohne diese Punkte bereits funktioniert

Mit `PAYMENTS_MODE=disabled` ist die Plattform voll nutzbar für Vermieter, die per Rechnung/vor Ort abrechnen: Sie können Pilotkunden im Admin manuell freischalten (Tarif + Ablaufdatum).
