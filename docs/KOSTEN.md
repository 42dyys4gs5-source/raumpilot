# Laufende Betriebskosten (Schätzung)

Stand Oktober 2026. Preise der Anbieter ändern sich – vor Vertragsabschluss auf den verlinkten Seiten prüfen. USD-Beträge ca. 1:0.80–0.90 in CHF.

## Fixkosten pro Monat

| Posten | Empfehlung | Kosten/Monat | Bemerkung |
|---|---|---|---|
| Hosting | Vercel Pro | ca. USD 20 pro Teammitglied | Für gewerbliche Nutzung zwingend (Hobby nur privat). Inkl. Cron alle 5 Min. — vercel.com/pricing |
| Datenbank + Speicher | Supabase Pro | ca. USD 25 | 8 GB DB, 100 GB Speicher, tägliche Backups (7 Tage). PITR-Add-on optional (ab ca. USD 100) — supabase.com/pricing |
| E-Mail | Resend | USD 0 bis 20 | Free: 3’000 E-Mails/Monat (max. 100/Tag); Pro USD 20 für 50’000 — resend.com/pricing. Ab ca. 30 aktiven Vermietern reicht Free nicht mehr. |
| Domain | raumvia.ch | ca. CHF 1–2 | ca. CHF 15–25 pro Jahr je nach Registrar |
| Fehlerüberwachung | Sentry | USD 0 | Developer-Plan kostenlos; internes Fehlerprotokoll ist immer aktiv |
| Bot-Schutz | Cloudflare Turnstile | USD 0 | kostenlos |
| CI/Backups | GitHub Actions | USD 0 | Tägliches Backup + CI im Free-Kontingent (privates Repo: 2’000 Min./Monat) |
| **Total Fixkosten** | | **ca. CHF 45–75** | ohne Steuern |

## Variable Kosten

| Posten | Wer bezahlt | Kosten |
|---|---|---|
| Stripe Billing (Ihre Abo-Einnahmen) | Sie | Kartengebühren (Schweiz/Europa ca. 2.9 % + CHF 0.30, international höher) **plus** Stripe-Billing-Gebühr (ca. 0.7 % des Abo-Volumens). Beispiel CHF 69-Abo: ca. CHF 2.80 pro Monat. — stripe.com/ch/pricing |
| Stripe-Gebühren auf Mietzahlungen | **Vermieter** (direkt von Stripe) | gemäss Stripe-Vertrag des Vermieters. Raumvia trägt diese nicht. |
| Stripe Connect | Sie | Bei Konten mit vollem Dashboard (Standard-Konfiguration, wie umgesetzt) fallen für die Plattform keine Connect-Kontogebühren an. Vor Livegang im Stripe-Vertrag bestätigen. |

## Beispielrechnung

| Szenario | Abo-Umsatz/Monat | Stripe-Gebühren (ca.) | Fixkosten | Deckungsbeitrag |
|---|---|---|---|---|
| 10 Kunden (Mix Ø CHF 65) | CHF 650 | CHF 33 | CHF 60 | ca. CHF 557 |
| 50 Kunden | CHF 3’250 | CHF 165 | CHF 80 | ca. CHF 3’005 |
| 200 Kunden | CHF 13’000 | CHF 660 | CHF 150 (Resend Pro, grössere DB) | ca. CHF 12’190 |

Nicht enthalten: MWST (ab CHF 100’000 Jahresumsatz Pflicht), Treuhand, Rechtsberatung, Versicherungen, Marketing.

## Kostenkontrolle

- Vercel: *Settings › Billing › Spend Management* mit Obergrenze aktivieren.
- Supabase: *Spend Cap* eingeschaltet lassen.
- Resend: Nutzung im Dashboard beobachten; E-Mails pro Buchung sind auf das Nötige reduziert (Bestätigung, Beleg, ggf. Erinnerung).
- Der Admin-Bereich zeigt Jobs und E-Mail-Volumen; der Monatsbericht fasst Umsatz zusammen.
