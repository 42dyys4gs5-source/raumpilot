# Ihre Schritte bis zum Livegang

Alles, was ohne Ihre Konten möglich war, ist erledigt: Code, Tests, Datenbank- und Stripe-Einrichtungsskripte, Geheimschlüssel, Markenrecherche, Rechtsvorlagen. Übrig bleiben nur Schritte, die **Ihre Identität, Ihre Unterschrift oder Ihr Geld** erfordern. Nach jedem Schritt schicken Sie mir die genannten Angaben, den Rest erledige ich.

---

## 1. Domain ✅ erledigt
`raumvia.ch` ist registriert (Hostpoint, Nameserver `ns*.hostpoint.ch`).

## 2. Postfach info@raumvia.ch ✅ erledigt
MX- und SPF-Einträge von Hostpoint sind aktiv. Raumvia verschickt E-Mails selbst über Resend; im Postfach lesen Sie Antworten von Kunden und Supportanfragen.

## 3. AHV-Anmeldung als Selbständige/r (15 Min.)
Bei der **Ausgleichskasse Ihres Wohnkantons** anmelden (online; Liste: ahv-iv.ch › Kontakte › Kantonale Ausgleichskassen). Für ein Einzelunternehmen unter CHF 100’000 Umsatz ist **kein Handelsregistereintrag und keine MWST** nötig.
Auftritt: Ihr Familienname muss im Firmennamen stehen, z. B. **«Max Muster, Raumvia»**.

## 4. Supabase ✅ erledigt (11.10.2026)
Projekt `iuevxsswjnamlwwelfsv` (Region Zürich): 33 Tabellen, Tarife, Doppelbuchungsschutz, Bucket `media`. Der öffentliche Datenzugriff über die Supabase-API ist gesperrt (RLS aktiv, keine Rechte für `anon`/`authenticated`). Raumvia greift nur serverseitig zu.
Noch offen: vor dem Livegang auf den Plan **Pro** wechseln (Backups) und den Access Token (`sbp_…`) unter Account › Access Tokens widerrufen.

## 5. Resend (10 Min., kostenlos)
1. resend.com › Sign up › **Domains** › Add Domain › `raumvia.ch` › Region **EU (Frankfurt)**.
2. Resend zeigt 3–4 DNS-Einträge (MX/TXT auf `send.raumvia.ch` und `resend._domainkey`). Diese beim Domain-Anbieter eintragen – sie stören Ihr Postfach nicht.
3. Zusätzlich eintragen: `TXT` · Name `_dmarc` · Wert `v=DMARC1; p=quarantine; rua=mailto:info@raumvia.ch`
4. **API Keys** › Create (Permission: Sending access).

→ **Mir schicken:** den API-Key (`re_…`). Ich prüfe die DNS-Einträge.

## 6. GitHub → Vercel (15 Min., ca. USD 20/Monat)
1. Den Pull Request in GitHub zusammenführen («Merge») – Link schicke ich Ihnen.
2. vercel.com › Sign up mit GitHub › Plan **Pro** › **Add New Project** › Repository `raumpilot` importieren.
3. Vor dem ersten Deploy: *Environment Variables* › **Import .env** › die Datei **`vercel-umgebungsvariablen.env`** einfügen, die ich vorbereitet habe. Zwei Platzhalter ersetzen Sie selbst (per Kopieren, nicht abtippen): `HIER-DATENBANK-PASSWORT` (Supabase-Datenbankpasswort) und `HIER-SECRET-KEY-EINFUEGEN` (Supabase › Project Settings › API Keys › Secret key, Kopier-Symbol).
4. **Deploy**.
5. Project › Settings › **Domains** › `raumvia.ch` hinzufügen. Die angezeigten Einträge (meist `A` → `76.76.21.21` und `CNAME www` → `cname.vercel-dns.com`) beim Domain-Anbieter eintragen.

→ Danach teste ich die Live-Seite vollständig (Registrierung, Buchung, E-Mails).

## 7. Ihre Angaben fürs Impressum
→ **Mir schicken:** Vor- und Nachname, Adresse, ggf. Telefon. Ich trage sie ein (Rechtsform: Einzelunternehmen, ohne UID).

## 8. Stripe (30 Min. + Prüfung durch Stripe)
1. stripe.com › Konto eröffnen · Land **Schweiz** · Unternehmensart **Einzelunternehmen** · Identität + Bankkonto (IBAN) angeben.
2. Dashboard › **Connect** › Get started (Plattform, «Software für Vermieter, Zahlungen gehen an die Vermieter»).
3. Entwickler › API-Schlüssel › **Testmodus**-Secret-Key (`sk_test_…`) kopieren.

→ **Mir schicken:** den Test-Schlüssel. Ich richte mit `scripts/stripe-setup.ts` automatisch Produkte, Preise, Kundenportal und Webhooks ein und teste Abo- und Buchungszahlungen. Danach dasselbe mit dem Live-Schlüssel.

## 9. Marke anmelden (20 Min., CHF 550 für 10 Jahre, bis 3 Klassen)
Online beim IGE (**ige.ch** › Marken › Marke anmelden) › Wortmarke `RAUMVIA` · Inhaber: Sie persönlich. Leistungsverzeichnis zum Einfügen:

**Klasse 9:** Herunterladbare Computersoftware zur Verwaltung, Buchung, Reservierung und Abrechnung von Räumlichkeiten; herunterladbare Anwendungen für Mobilgeräte zur Buchung von Räumlichkeiten.

**Klasse 35:** Bereitstellung von Online-Verzeichnissen mit Informationen über zu vermietende Räumlichkeiten; Vermittlung von Verträgen für Dritte über die Vermietung von Räumlichkeiten über eine Online-Plattform; Werbung für Dritte im Internet.

**Klasse 42:** Software als Dienstleistung [SaaS] zur Verwaltung, Buchung, Reservierung und Abrechnung von Räumlichkeiten; Bereitstellung der zeitweiligen Nutzung von nicht herunterladbarer Online-Software für Kalenderverwaltung, Buchungen und Zahlungsabwicklung; Gestaltung und Hosting von Buchungswebseiten für Dritte.

(Gebühren und Formulierungen vor dem Absenden in der IGE-Maske prüfen; das IGE bietet auch eine kostenpflichtige Vorprüfung an.)

## 10. Rechtstexte prüfen lassen
Impressum, Datenschutz, AGB, Nutzungsbedingungen und Auftragsbearbeitung einer Fachperson vorlegen (Website › Rechtliches). Danach entferne ich den Entwurfshinweis.

---

### Übersicht: Was ich von Ihnen brauche

| Nach Schritt | Bitte schicken |
|---|---|
| 5 | Resend API-Key |
| 6 | Bestätigung «Vercel-Projekt angelegt» |
| 7 | Name, Adresse, Telefon fürs Impressum |
| 8 | Stripe Test-Secret-Key, später Live-Key |
