# Tests

Alle Ergebnisse unten stammen aus tatsächlichen Testläufen in der Entwicklungsumgebung (PostgreSQL 16, Node 22, Chromium 141). Nichts davon ist simuliert – mit einer Ausnahme, die offen ausgewiesen ist: **Zahlungsanbieter**. Ohne Stripe-Zugangsdaten werden Zahlungen in den E2E-Tests über ein Test-Gateway (`PAYMENTS_MODE=fake`) simuliert, das synthetische Stripe-Ereignisse durch denselben Webhook-Code leitet. Die Stripe-Signaturprüfung selbst ist mit echten, von der Stripe-Bibliothek signierten Testereignissen abgedeckt. Ein Durchlauf gegen die echte Stripe-API steht aus (siehe OFFENE-PUNKTE §D).

## Unit-Tests (`tests/unit`, Vitest)

| Datei | Prüft |
|---|---|
| `availability.test.ts` | Winter-/Sommerzeit, Fenster über Mitternacht, Buchungen in der Umstellungsnacht (5 bzw. 7 Std.), Slots, Puffer, Vorlaufzeit, Buchungshorizont, geschlossene/ausgebuchte Tage, Mehrtagesbuchungen |
| `pricing.test.ts` | Stunden-/Halbtages-/Tages-/Mehrtagespreise, Wochenendzuschlag (auch anteilig über Mitternacht), Extras pro Buchung/Person/Stunde, Rabattcode, Mindestbetrag, Kaution, MWST, Rückerstattungsregeln |
| `security.test.ts` | scrypt-Hashing, Passwortregeln, TOTP gegen RFC-6238-Testvektor, AES-GCM inkl. Manipulationserkennung, fälschungssichere Buchungslinks, SSRF-Schutz, Geld- und Slug-Formatierung |
| `ical.test.ts` | Zeitzonen, Wiederholungen mit Ausnahmen, Ganztagestermine, Ignorieren freier und eigener Termine, RFC-5545-Export inkl. Escaping/Faltung, Rundlauf Export → Import |

## Integrationstests (`tests/integration`, Vitest gegen echte PostgreSQL-Datenbank)

| Datei | Prüft |
|---|---|
| `booking-engine.test.ts` | Bestätigung + E-Mails genau einmal; **20 gleichzeitige Buchungen desselben Termins → genau 1 Erfolg**; überlappende gleichzeitige Buchungen; Exclusion-Constraint auch bei Umgehung der App-Logik; Reinigungspuffer; Ferien-Sperren; nicht buchbare Räume/Konten; Kapazität/Mindestdauer; Mandantentrennung; Haltefrist und idempotente Zahlungsbestätigung; Zahlungen von fremden Stripe-Konten; Freigabe abgelaufener Reservationen; verspätete Zahlung (Reaktivierung bzw. automatische Rückerstattung); Stornierung nach Regeln, durch Vermieter, durch fremde Vermieter; Anfrage → Annahme → Zahlung; Ablehnung; Umbuchung; Rabattcode-Limit unter Last; Erinnerungen genau einmal |
| `webhooks-billing.test.ts` | Ungültige Stripe-Signatur → 400; signierte Abo-Ereignisse aktivieren den Tarif; Duplikate werden erkannt; Kündigung zum Laufzeitende, fehlgeschlagene Zahlung (Kulanzzugang), Abo-Ende (Zugang entzogen) inkl. E-Mails; Raumlimit nach Downgrade; Connect-Zahlung bestätigt Buchung, fremdes Konto wird ignoriert; Kontoverifizierung |
| `platform.test.ts` | Mandantentrennung (Räume, Kunden); iCal-Import blockiert Zeiten, meldet Konflikte genau einmal, storniert nie; Abruffehler; Job-Deduplizierung, Backoff und endgültiges Scheitern mit Fehlerprotokoll; Einmal-Tokens; Rate-Limit |

## End-to-End-Tests (`tests/e2e`, Playwright, Produktions-Build)

| Datei | Szenarien |
|---|---|
| `landlord-and-booking.spec.ts` | Registrierung mit E-Mail-Bestätigung → Assistent → Raum → Abo-Abschluss → Veröffentlichung; Buchung (vor Ort zahlen) mit Bestätigungs-E-Mail und Sichtbarkeit im Dashboard; zweite Buchung desselben Termins über API → 409; Selbststornierung; Stripe Connect verbinden, Onlinezahlung, Beleg, Stornierung mit Rückerstattung; Zahlungsabbruch gibt Termin frei; Zahlungsfehler; Anfrage → Annahme → Zahlung per Link; Abo-Verlängerung, fehlgeschlagene Abo-Zahlung, Kündigung zum Laufzeitende; Passwort-Reset (Link nur einmal gültig) |
| `security.spec.ts` | Umleitung geschützter Bereiche; generische Login-Fehler; **Datenisolation über HTTP** (fremde Räume/QR-Codes → 404); CSRF-Schutz der API; Sicherheits-Header (inkl. Ausnahme für Widget); Admin-Login nur mit gültigem 2FA-Code |
| `public-site.spec.ts` | 15 öffentliche Seiten laden ohne JavaScript-Fehler mit Titel und H1; Sitemap, robots, Canonical, strukturierte Daten; Kontaktformular |
| `mobile.spec.ts` | Smartphone-Ansicht (Pixel 7): kein horizontales Scrollen, mobiles Menü |

## Ergebnisse des letzten Laufs

Siehe Abschnitt am Ende dieser Datei (wird bei jedem vollständigen Lauf aktualisiert).

## Ausführen

```bash
# einmalig: Test-Datenbanken mit Erweiterungen anlegen (raumpilot_test, raumpilot_e2e)
npm test                 # Unit + Integration
npm run build && npm run test:e2e
```

## Letzter vollständiger Lauf (Oktober 2026)

| Suite | Ergebnis |
|---|---|
| TypeScript (`tsc --noEmit`) | fehlerfrei |
| ESLint | 0 Fehler |
| Vitest Unit + Integration | **76 / 76 bestanden** (7 Dateien) |
| Produktions-Build (`next build`) | erfolgreich |
| Playwright E2E (Desktop Chrome + Pixel 7) | **37 / 37 bestanden** |

Durch die Tests gefundene und behobene Fehler (Auswahl): möglicher Verbindungs-Deadlock bei parallelen Buchungen, Admin-Weiterleitung nach 2FA ins Vermieter-Onboarding, verschwindende Erfolgsmeldungen nach Veröffentlichen/Annehmen/Stornieren, endlose Webhook-Wiederholungen bei Ereignissen fremder Stripe-Konten; Aktualisierung von sharp auf 0.35.5 (Sicherheitslücken in libvips).

Bekannt: `npm audit` meldet PostCSS innerhalb von Next.js 15 (nur Build-Zeit, keine Benutzereingaben). Behebung mit dem Upgrade auf Next.js 16.
