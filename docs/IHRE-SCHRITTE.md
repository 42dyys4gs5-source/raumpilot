# Ihre Schritte bis zum Livegang

Alles, was ohne Ihre Konten möglich war, ist erledigt: Code, Tests, Datenbank- und Stripe-Einrichtungsskripte, Geheimschlüssel, Markenrecherche, Rechtsvorlagen. Übrig bleiben nur Schritte, die **Ihre Identität, Ihre Unterschrift oder Ihr Geld** erfordern. Nach jedem Schritt schicken Sie mir die genannten Angaben, den Rest erledige ich.

---

## 1. Domain ✅ erledigt
`raumvia.ch` ist registriert (Hostpoint, Nameserver `ns*.hostpoint.ch`).

## 2. Postfach info@raumvia.ch ✅ erledigt
MX- und SPF-Einträge von Hostpoint sind aktiv. Raumvia verschickt E-Mails selbst über Resend; im Postfach lesen Sie Antworten von Kunden und Supportanfragen.

## 3. AHV-Anmeldung ✅ erledigt
Als Selbständiger bei der Ausgleichskasse angemeldet.

## 4. Supabase ✅ erledigt (11.10.2026)
Projekt `iuevxsswjnamlwwelfsv` (Region Zürich): 33 Tabellen, Tarife, Doppelbuchungsschutz, Bucket `media`. Der öffentliche Datenzugriff über die Supabase-API ist gesperrt (RLS aktiv, keine Rechte für `anon`/`authenticated`). Raumvia greift nur serverseitig zu.
Noch offen: vor dem Livegang auf den Plan **Pro** wechseln (Backups) und den Access Token (`sbp_…`) unter Account › Access Tokens widerrufen.

## 5. Resend ✅ erledigt
Domain `raumvia.ch` mit DKIM/SPF-Einträgen bei Hostpoint eingetragen (Region EU), API-Key in Vercel hinterlegt.

## 6. Vercel ✅ erledigt (12.10.2026)
Projekt `raumvia` (Team Pro, Testphase), Domain `raumvia.ch` (www leitet weiter), Umgebungsvariablen gesetzt. `DATABASE_URL` nutzt den Supabase **Session-Pooler (Port 5432)**.
Offen: Vor Ablauf der Pro-Testphase Zahlungsmittel hinterlegen (ca. USD 20/Monat).

## 7. Impressum ✅ erledigt
Betreiber: Sven Schwenter (Einzelunternehmen), Münchenstein. Bei Änderungen: Admin › Einstellungen.

## 8. Stripe ✅ erledigt (12.10.2026)
Konto verifiziert (Zahlungen und Auszahlungen aktiv). Live-Produkte, -Preise, Kundenportal und Webhooks angelegt; Abo, Connect-Onboarding und Buchung mit Onlinezahlung im Testmodus Ende-zu-Ende getestet. Offen: Connect-Plattformprofil im Live-Modus prüfen.

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
