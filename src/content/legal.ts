import { BRAND } from "@/config/brand";
import type { OperatorInfo } from "@/lib/settings";
import type { Block } from "./types";

/**
 * TEMPLATES – NOT LEGAL ADVICE. All texts must be reviewed by a qualified lawyer
 * before going live. Operator data is filled from Admin › Einstellungen.
 */

export type LegalDoc = { slug: string; title: string; description: string; body: (op: OperatorInfo) => Block[] };

const MISSING = "[Angabe fehlt – im Admin-Bereich ergänzen]";
const v = (s: string) => (s && s.trim() ? s : MISSING);
const addr = (op: OperatorInfo) => `${v(op.name)}${op.legalForm ? ` (${op.legalForm})` : ""}, ${v(op.street)}, ${v(op.postalCode)} ${v(op.city)}, ${op.country || "Schweiz"}`;

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "impressum",
    title: "Impressum",
    description: `Impressum von ${BRAND.name}.`,
    body: (op) => [
      { h: "Betreiberin", p: addr(op) },
      { p: `E-Mail: ${v(op.email)}${op.phone ? ` · Telefon: ${op.phone}` : ""}` },
      { p: `Vertretungsberechtigte Person: ${v(op.representative)}` },
      { p: `Unternehmens-Identifikationsnummer (UID): ${v(op.uid)}${op.vatRegistered ? ` · MWST-Nr.: ${v(op.vatNumber)}` : ""}` },
      { h: "Haftungsausschluss", p: "Wir prüfen die Inhalte dieser Website sorgfältig, übernehmen jedoch keine Gewähr für Richtigkeit, Vollständigkeit und Aktualität. Für Inhalte der Vermieterinnen und Vermieter (Raumbeschreibungen, Preise, Fotos, Bedingungen) sind ausschliesslich diese verantwortlich." },
      { h: "Haftung für Links", p: "Verweise auf Websites Dritter liegen ausserhalb unseres Verantwortungsbereichs. Wir lehnen jede Verantwortung für solche Websites ab." },
      { h: "Urheberrechte", p: `Die Rechte an Texten, Gestaltung und Software von ${BRAND.name} liegen bei der Betreiberin. Fotos und Texte auf Buchungsseiten stammen von den jeweiligen Vermieterinnen und Vermietern.` },
    ],
  },
  {
    slug: "datenschutz",
    title: "Datenschutzerklärung",
    description: `Wie ${BRAND.name} Personendaten bearbeitet.`,
    body: (op) => [
      { p: `Diese Datenschutzerklärung informiert über die Bearbeitung von Personendaten durch ${v(op.name)} («wir») im Zusammenhang mit der Website ${BRAND.domain} und der Buchungssoftware ${BRAND.name}. Sie richtet sich nach dem Schweizer Bundesgesetz über den Datenschutz (DSG) und, soweit anwendbar, nach der EU-Datenschutz-Grundverordnung (DSGVO).` },
      { h: "1. Verantwortliche Stelle", p: `${addr(op)}. Kontakt für Datenschutzanliegen: ${v(op.email)}.` },
      { h: "2. Zwei Rollen: Plattform und Auftragsbearbeitung", ul: [
        "Für Daten unserer Kundinnen und Kunden (Vermieterinnen und Vermieter mit Raumvia-Konto) sowie für Besuchende unserer Website sind wir Verantwortliche.",
        "Für Daten, die Mieterinnen und Mieter bei einer Raumbuchung angeben, ist der jeweilige Vermieter verantwortlich. Wir bearbeiten diese Daten in seinem Auftrag (Auftragsbearbeitung) und nur zur Abwicklung der Buchung. Anfragen zu diesen Daten richten Sie bitte direkt an den Vermieter; wir leiten Anfragen weiter.",
      ] },
      { h: "3. Welche Daten wir bearbeiten", ul: [
        "Konto- und Vertragsdaten: Name, Firma, E-Mail, Telefon, Rechnungsadresse, UID/MWST-Nummer, gewählter Tarif, Zahlungsstatus.",
        "Buchungsdaten: Name, E-Mail, Telefon, Firma, Nachricht, gewählter Raum, Zeitraum, Personenzahl, Zusatzleistungen, Preis und Zahlungsstatus.",
        "Technische Daten: IP-Adresse, Browser-Informationen, Zeitpunkt von Anmeldungen und sicherheitsrelevanten Vorgängen (Protokollierung zum Schutz vor Missbrauch).",
        "Kommunikation: Inhalte von Support- und Kontaktanfragen.",
      ] },
      { h: "4. Zwecke", ul: [
        "Bereitstellung der Software, Abwicklung von Buchungen und Zahlungen, Versand automatischer Benachrichtigungen.",
        "Abrechnung der Abonnemente, Buchhaltung und Erfüllung gesetzlicher Aufbewahrungspflichten.",
        "Sicherheit (z. B. Schutz vor Missbrauch und automatisierten Angriffen), Fehleranalyse und Weiterentwicklung.",
        "Beantwortung von Anfragen und Support.",
      ] },
      { h: "5. Cookies und Analyse", p: "Wir setzen nur technisch notwendige Cookies ein (insbesondere ein Sitzungs-Cookie nach der Anmeldung). Wir verwenden keine Werbe- oder Tracking-Cookies und keine Analysedienste, die Personenprofile erstellen." },
      { h: "6. Empfänger und Dienstleister", p: "Wir setzen sorgfältig ausgewählte Dienstleister ein, mit denen Verträge zur Auftragsbearbeitung bestehen:", ul: [
        "Hosting der Anwendung: Vercel Inc. (USA/EU-Regionen) [vor Livegang Region und Vertrag prüfen].",
        "Datenbank und Dateispeicher: Supabase Inc. bzw. deren Infrastrukturpartner [Region festlegen, empfohlen: Schweiz/EU].",
        "Zahlungsabwicklung: Stripe Payments Europe Ltd. (Irland). Zahlungsdaten (z. B. Kartennummern) werden ausschliesslich von Stripe bearbeitet.",
        "E-Mail-Versand: Resend Inc. (USA).",
        "Fehlerüberwachung (falls aktiviert): Functional Software Inc. (Sentry).",
      ] },
      { h: "7. Bekanntgabe ins Ausland", p: "Einige Dienstleister bearbeiten Daten in Staaten ohne angemessenes Datenschutzniveau (z. B. USA). In diesen Fällen stützen wir uns auf die Standardvertragsklauseln der EU-Kommission (in der vom EDÖB anerkannten Fassung) bzw. auf eine Zertifizierung nach dem Swiss-U.S. Data Privacy Framework, soweit vorhanden. [Vor Livegang je Anbieter prüfen.]" },
      { h: "8. Aufbewahrung", p: "Wir speichern Personendaten nur so lange, wie es für die genannten Zwecke erforderlich ist oder gesetzliche Pflichten bestehen (z. B. 10 Jahre für Geschäftsunterlagen). Protokolldaten löschen wir in der Regel nach spätestens 12 Monaten, E-Mail-Versandprotokolle nach 180 Tagen." },
      { h: "9. Datensicherheit", p: "Wir treffen angemessene technische und organisatorische Massnahmen, insbesondere verschlüsselte Übertragung (TLS), Verschlüsselung sensibler Daten, Zugriffsbeschränkungen nach dem Need-to-know-Prinzip, Zwei-Faktor-Authentifizierung für Administratoren, Protokollierung und regelmässige Datensicherungen." },
      { h: "10. Ihre Rechte", p: `Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Bearbeitung, Datenherausgabe bzw. -übertragung sowie, soweit die DSGVO anwendbar ist, Widerspruch. Kontoinhaber können ihre Daten in den Einstellungen selbst exportieren und löschen. Wenden Sie sich an ${v(op.email)}. Sie haben zudem das Recht, sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) bzw. einer zuständigen EU-Aufsichtsbehörde zu beschweren.` },
      { h: "11. Änderungen", p: "Wir können diese Datenschutzerklärung anpassen. Es gilt die auf dieser Website veröffentlichte Fassung." },
    ],
  },
  {
    slug: "agb",
    title: "Allgemeine Geschäftsbedingungen (AGB)",
    description: `Vertragsbedingungen für das ${BRAND.name}-Abonnement.`,
    body: (op) => [
      { h: "1. Geltungsbereich", p: `Diese AGB regeln die Nutzung der Software ${BRAND.name} durch Vermieterinnen und Vermieter («Kunde») gegen Entgelt. Anbieterin ist ${addr(op)} («Anbieterin»). Das Angebot richtet sich an Unternehmen, Vereine und selbständig tätige Personen.` },
      { h: "2. Leistungen", p: `Die Anbieterin stellt eine webbasierte Software zur Verwaltung und Online-Buchung von Räumen bereit (Software as a Service). Der Leistungsumfang richtet sich nach dem gewählten Tarif gemäss Preisseite. Die Anbieterin ist nicht Vermieterin der Räume und nicht Vertragspartei der Mietverträge zwischen Kunde und Mietenden.` },
      { h: "3. Vertragsschluss und Testphase", p: "Der Vertrag kommt mit Abschluss des Abonnements im Bestellprozess zustande. Eine allfällige kostenlose Testphase geht ohne Kündigung automatisch in das gewählte kostenpflichtige Abonnement über." },
      { h: "4. Preise und Zahlung", p: `Es gelten die Preise gemäss Preisseite zum Zeitpunkt der Bestellung, in CHF. ${op.vatRegistered ? "Die Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer." : "Die Anbieterin ist derzeit nicht mehrwertsteuerpflichtig."} Die Abrechnung erfolgt monatlich im Voraus über den Zahlungsdienstleister Stripe. Bei Zahlungsverzug kann die Anbieterin den Zugang nach Mahnung einschränken. Preisänderungen werden mindestens 30 Tage im Voraus angekündigt; der Kunde kann auf das Inkrafttreten hin kündigen.` },
      { h: "5. Laufzeit und Kündigung", p: "Das Abonnement verlängert sich jeweils um einen Monat und kann jederzeit auf das Ende der laufenden Abrechnungsperiode gekündigt werden. Bereits bezahlte Beträge werden nicht zurückerstattet. Das Recht zur fristlosen Kündigung aus wichtigem Grund bleibt vorbehalten." },
      { h: "6. Pflichten des Kunden", ul: [
        "Der Kunde ist für die Inhalte seiner Buchungsseiten (Texte, Fotos, Preise, Bedingungen) sowie deren Rechtmässigkeit verantwortlich, einschliesslich allfälliger Bewilligungen, Steuern und Abgaben.",
        "Er schliesst die Mietverträge im eigenen Namen ab und ist für die Erfüllung (Übergabe, Reinigung, Haftung, Rückerstattungen) allein verantwortlich.",
        "Er hält Zugangsdaten geheim und informiert die Anbieterin unverzüglich über Missbrauch.",
        "Er beachtet das Datenschutzrecht gegenüber seinen Mietenden und informiert diese über die Nutzung von Raumvia.",
      ] },
      { h: "7. Zahlungen der Mietenden", p: "Onlinezahlungen der Mietenden werden über ein eigenes Konto des Kunden bei Stripe abgewickelt. Es gelten zusätzlich die Bedingungen von Stripe. Die Anbieterin ist nicht Zahlungsempfängerin und haftet nicht für Leistungen von Stripe." },
      { h: "8. Verfügbarkeit", p: "Die Anbieterin bemüht sich um eine hohe Verfügbarkeit, garantiert jedoch keine unterbrechungsfreie Nutzung. Wartungsarbeiten werden nach Möglichkeit ausserhalb der Hauptnutzungszeiten durchgeführt." },
      { h: "9. Haftung", p: "Die Anbieterin haftet für Schäden nur bei Vorsatz oder grober Fahrlässigkeit. Die Haftung für leichte Fahrlässigkeit, indirekte Schäden, entgangenen Gewinn und Datenverlust wird – soweit gesetzlich zulässig – ausgeschlossen. Die Haftung ist in jedem Fall auf die in den letzten zwölf Monaten bezahlten Abonnementsgebühren beschränkt." },
      { h: "10. Daten", p: "Der Kunde bleibt Eigentümer seiner Daten. Für Personendaten der Mietenden gilt die Vereinbarung zur Auftragsbearbeitung als Bestandteil dieser AGB. Nach Vertragsende kann der Kunde seine Daten während 30 Tagen exportieren; danach werden sie gelöscht, vorbehältlich gesetzlicher Aufbewahrungspflichten." },
      { h: "11. Änderungen der AGB", p: "Änderungen werden dem Kunden mindestens 30 Tage vor Inkrafttreten mitgeteilt. Widerspricht der Kunde nicht innert dieser Frist bzw. kündigt er nicht, gelten die Änderungen als angenommen." },
      { h: "12. Anwendbares Recht und Gerichtsstand", p: `Es gilt Schweizer Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist der Sitz der Anbieterin (${v(op.city)}).` },
    ],
  },
  {
    slug: "nutzungsbedingungen",
    title: "Nutzungsbedingungen",
    description: `Bedingungen für die Nutzung der Website und der Buchungsseiten von ${BRAND.name}.`,
    body: (op) => [
      { h: "1. Gegenstand", p: `Diese Bedingungen gelten für alle Besuchenden der Website ${BRAND.domain} und für Personen, die über eine Buchungsseite einen Raum anfragen oder buchen («Mietende»). Für Vermieter mit Abonnement gelten zusätzlich die AGB.` },
      { h: "2. Rolle von Raumvia", p: `${v(op.name)} betreibt lediglich die Buchungssoftware. Der Mietvertrag kommt ausschliesslich zwischen Mietenden und dem auf der Buchungsseite genannten Vermieter zustande. Für den Raum, seine Beschreibung, Preise, Mietbedingungen, Übergabe und Rückerstattungen ist allein der Vermieter verantwortlich.` },
      { h: "3. Buchung", p: "Mit dem Absenden einer Sofortbuchung geben Mietende ein verbindliches Angebot zum Abschluss eines Mietvertrags zu den angezeigten Bedingungen ab; bei Onlinezahlung wird die Buchung mit erfolgreicher Zahlung bestätigt. Eine Buchungsanfrage ist unverbindlich, bis der Vermieter sie annimmt und – sofern verlangt – die Zahlung eingegangen ist." },
      { h: "4. Stornierung", p: "Es gelten die auf der Buchungsseite angezeigten Stornierungsbedingungen des Vermieters. Stornierungen erfolgen über den persönlichen Link in der Bestätigung." },
      { h: "5. Zulässige Nutzung", p: "Untersagt sind missbräuchliche Buchungen, automatisierte Abfragen ohne Zustimmung, Eingriffe in die Sicherheit der Plattform sowie rechtswidrige Inhalte." },
      { h: "6. Haftung", p: "Soweit gesetzlich zulässig, haftet die Betreiberin nicht für Schäden aus dem Mietverhältnis oder aus der Nutzung der Website, ausser bei Vorsatz oder grober Fahrlässigkeit." },
      { h: "7. Recht und Gerichtsstand", p: "Es gilt Schweizer Recht. Zwingende Gerichtsstände für Konsumentinnen und Konsumenten bleiben vorbehalten." },
    ],
  },
  {
    slug: "auftragsbearbeitung",
    title: "Vereinbarung zur Auftragsbearbeitung",
    description: "Bearbeitung von Personendaten der Mietenden im Auftrag der Vermieter (Art. 9 DSG / Art. 28 DSGVO).",
    body: (op) => [
      { p: `Diese Vereinbarung ist Bestandteil der AGB zwischen dem Kunden (Vermieter, «Verantwortlicher») und ${v(op.name)} («Auftragsbearbeiterin»).` },
      { h: "1. Gegenstand und Dauer", p: "Die Auftragsbearbeiterin bearbeitet Personendaten der Mietenden ausschliesslich zur Erbringung der Software-Leistungen (Buchungsabwicklung, Benachrichtigungen, Zahlungsabwicklung über Stripe) für die Dauer des Vertrags." },
      { h: "2. Art der Daten und betroffene Personen", p: "Kontaktdaten (Name, E-Mail, Telefon, Firma), Buchungsdaten (Raum, Zeitraum, Personenzahl, Nachricht), Zahlungsstatus. Betroffen sind Mietende und Interessierte des Kunden." },
      { h: "3. Weisungen", p: "Die Auftragsbearbeiterin bearbeitet die Daten nur gemäss dokumentierten Weisungen des Verantwortlichen, die grundsätzlich durch die Konfiguration der Software erteilt werden." },
      { h: "4. Vertraulichkeit und Sicherheit", p: "Zur Bearbeitung befugte Personen sind zur Vertraulichkeit verpflichtet. Es bestehen angemessene technische und organisatorische Massnahmen (u. a. TLS-Verschlüsselung, Mandantentrennung, Zugriffskontrolle, Zwei-Faktor-Authentifizierung für Administratoren, Protokollierung, Datensicherung)." },
      { h: "5. Unterauftragsbearbeiter", p: "Der Verantwortliche genehmigt den Beizug der in der Datenschutzerklärung genannten Dienstleister (Hosting, Datenbank, E-Mail-Versand, Fehlerüberwachung). Über Änderungen wird vorgängig informiert; der Verantwortliche kann aus wichtigem Grund widersprechen." },
      { h: "6. Unterstützung", p: "Die Auftragsbearbeiterin unterstützt den Verantwortlichen bei Auskunfts-, Lösch- und Herausgabebegehren (u. a. durch Export- und Löschfunktionen) sowie bei Meldungen von Verletzungen der Datensicherheit, die sie unverzüglich mitteilt." },
      { h: "7. Rückgabe und Löschung", p: "Nach Vertragsende kann der Verantwortliche die Daten exportieren. Danach werden sie gelöscht, soweit keine gesetzliche Aufbewahrungspflicht besteht." },
    ],
  },
  {
    slug: "stornierungsbedingungen-vorlage",
    title: "Vorlage: Miet- und Stornierungsbedingungen für Vermieter",
    description: "Eine anpassbare Vorlage, die Vermieter für ihre eigenen Räume verwenden können.",
    body: () => [
      { note: "Diese Vorlage dient Vermietern als Ausgangspunkt für eigene Bedingungen. Passen Sie sie an Ihren Raum an und lassen Sie sie rechtlich prüfen. Fristen und Prozentsätze stellen Sie pro Raum in Raumvia ein; diese werden automatisch angewendet." },
      { h: "1. Vertragsparteien", p: "Der Mietvertrag kommt zwischen [Name Vermieter] und der buchenden Person zustande. Raumvia stellt lediglich die Buchungssoftware zur Verfügung." },
      { h: "2. Mietdauer", p: "Die Mietdauer umfasst die gebuchte Zeit inklusive Auf- und Abbau. Eine Überschreitung wird mit [CHF … pro angebrochene Stunde] verrechnet." },
      { h: "3. Stornierung durch die Mietpartei", ul: ["Bis [72] Stunden vor Mietbeginn: kostenlos.", "Bis [24] Stunden vor Mietbeginn: Rückerstattung von [50] % des Mietpreises.", "Danach: keine Rückerstattung.", "Eine bezahlte Kaution wird in jedem Fall zurückerstattet, abzüglich allfälliger Schäden."] },
      { h: "4. Stornierung durch den Vermieter", p: "Muss der Vermieter die Buchung aus wichtigen Gründen absagen, wird der bezahlte Betrag vollständig zurückerstattet. Weitergehende Ansprüche sind ausgeschlossen, soweit gesetzlich zulässig." },
      { h: "5. Nutzung und Haftung", p: "Die Mietpartei verwendet den Raum sorgfältig, hält die Hausregeln ein und haftet für Schäden, die während der Mietdauer verursacht werden." },
      { h: "6. Kaution", p: "Die Kaution von [CHF …] wird [bei der Buchung online / vor Ort] hinterlegt und innert [7] Tagen nach der Miete zurückerstattet." },
    ],
  },
];

export const getLegalDoc = (slug: string) => LEGAL_DOCS.find((d) => d.slug === slug);
