import type { RoomCategory } from "@/lib/db/schema";
import type { Block } from "./types";

export type Solution = {
  slug: string;
  category: RoomCategory;
  name: string; // plural, e.g. "Eventräume"
  metaTitle: string;
  metaDescription: string;
  headline: string;
  intro: string;
  pains: string[];
  features: { title: string; text: string }[];
  body: Block[];
  faq: { q: string; a: string }[];
};

export const SOLUTIONS: Solution[] = [
  {
    slug: "eventraeume",
    category: "eventraum",
    name: "Eventräume",
    metaTitle: "Buchungssoftware für Eventräume und Eventlocations",
    metaDescription: "Eventraum online vermieten: Verfügbarkeitskalender, Anfragen mit Freigabe, Zusatzleistungen wie Catering oder Technik und Onlinezahlung – für Eventlocations in der Schweiz.",
    headline: "Eventraum vermieten – ohne E-Mail-Pingpong",
    intro: "Firmenanlässe, Hochzeiten, Geburtstage: Bei Eventlocations dauert die Abklärung oft länger als der Anlass selbst. Mit Raumvia sehen Interessierte sofort freie Daten, Preise und Leistungen – und Sie entscheiden, welche Anfragen Sie annehmen.",
    pains: ["Anfragen für bereits vergebene Daten", "Offerten mit Zusatzleistungen von Hand rechnen", "Anzahlungen und Kautionen nachfassen", "Aufbau- und Reinigungszeiten vergessen"],
    features: [
      { title: "Anfrage mit Freigabe", text: "Termine bleiben reserviert, bis Sie entscheiden. Nach Ihrer Zusage erhält der Kunde automatisch den Zahlungslink." },
      { title: "Zusatzleistungen", text: "Catering pro Person, Technik pauschal, Endreinigung – der Preisrechner rechnet alles transparent zusammen." },
      { title: "Auf- und Abbauzeiten", text: "Vorbereitungs- und Reinigungspuffer werden automatisch blockiert." },
      { title: "Kaution online", text: "Kaution mit der Buchung einziehen und nach dem Anlass mit einem Klick zurückerstatten." },
    ],
    body: [
      { h: "Tages- und Halbtagespauschalen", p: "Viele Eventräume werden pro Halbtag oder Tag vermietet. Hinterlegen Sie Stunden-, Halbtages- und Tagespreise – Raumvia wählt automatisch den günstigsten für die gewählte Dauer. Wochenendzuschläge legen Sie als Regel fest." },
      { h: "Anlässe bis nach Mitternacht", p: "Öffnungszeiten wie 17:00–02:00 sind kein Problem. Auch die Zeitumstellung im März und Oktober wird korrekt berücksichtigt." },
    ],
    faq: [
      { q: "Kann ich Anfragen ablehnen, ohne einen Grund anzugeben?", a: "Ja. Sie können optional eine Nachricht mitschicken. Der Termin wird sofort wieder freigegeben." },
      { q: "Kann ich eine Anzahlung statt des Gesamtbetrags verlangen?", a: "Derzeit wird der Gesamtbetrag (optional inkl. Kaution) online bezahlt oder die Zahlung erfolgt per Rechnung. Teilzahlungen sind für eine spätere Version vorgesehen." },
    ],
  },
  {
    slug: "partyraeume",
    category: "partyraum",
    name: "Partyräume",
    metaTitle: "Partyraum online vermieten – Buchungssystem mit Kalender",
    metaDescription: "Partyraum vermieten mit eigener Buchungsseite: Verfügbarkeit in Echtzeit, Buchungen über Mitternacht, Hausregeln, Kaution und Onlinezahlung mit Karte oder TWINT.",
    headline: "Ihr Partyraum, rund um die Uhr buchbar",
    intro: "Wer einen Partyraum sucht, will schnell wissen: Ist der Samstag noch frei, was kostet es, was ist erlaubt? Raumvia beantwortet diese Fragen automatisch und nimmt die Buchung samt Zahlung entgegen.",
    pains: ["Dutzende Nachrichten «Ist der 12. noch frei?»", "Ausfälle wegen Kurzentschlossener, die nicht erscheinen", "Unklare Hausregeln und Nachtruhe", "Kautionen in bar"],
    features: [
      { title: "Freie Daten auf einen Blick", text: "Der Verfügbarkeitskalender zeigt freie und ausgebuchte Tage – auch auf dem Smartphone." },
      { title: "Über Mitternacht", text: "Buchungen von 19:00 bis 03:00 Uhr werden korrekt gerechnet und blockiert." },
      { title: "Hausregeln akzeptieren", text: "Mieter bestätigen Mietbedingungen und Hausregeln vor der Buchung." },
      { title: "Bezahlt ist gebucht", text: "Mit Onlinezahlung ist die Buchung erst nach Zahlungseingang bestätigt – keine Geisterbuchungen." },
    ],
    body: [
      { h: "Wochenende teurer, Werktag günstiger", p: "Mit Preisregeln setzen Sie z. B. +25 % für Freitag- und Samstagabend oder –15 % unter der Woche. Die Mieter sehen den Zuschlag transparent im Preisrechner." },
      { h: "Reinigung einplanen", p: "Legen Sie eine Reinigungszeit nach jeder Buchung fest. Der nächste Termin ist erst danach buchbar." },
    ],
    faq: [
      { q: "Kann ich die Kaution online einziehen?", a: "Ja, wenn Onlinezahlung aktiv ist. Die Kaution wird separat ausgewiesen und kann nach dem Anlass ganz oder teilweise zurückerstattet werden." },
      { q: "Was passiert bei einer Stornierung?", a: "Es gelten Ihre Stornierungsbedingungen. Rückerstattungen werden automatisch ausgelöst." },
    ],
  },
  {
    slug: "sitzungszimmer",
    category: "sitzungszimmer",
    name: "Sitzungszimmer",
    metaTitle: "Sitzungszimmer vermieten – Online-Reservation stundenweise",
    metaDescription: "Sitzungszimmer und Meetingräume stundenweise online vermieten: Sofortbuchung, Rechnungsstellung für Firmen, Kalender-Synchronisation mit Outlook und Google.",
    headline: "Sitzungszimmer stundenweise vermieten",
    intro: "Ob Coworking, Kanzlei oder Bürogebäude: Freie Sitzungszimmer lassen sich mit wenig Aufwand vermieten. Firmenkunden buchen selbst, erhalten eine Bestätigung mit Kalendereintrag und bezahlen online oder per Rechnung.",
    pains: ["Leere Räume, während andere suchen", "Reservationen per Telefon und Excel", "Überschneidungen mit internen Meetings"],
    features: [
      { title: "Sofortbuchung im 30-Minuten-Raster", text: "Kurze Buchungen ab einer Stunde, Startzeiten im 15-, 30- oder 60-Minuten-Raster." },
      { title: "Outlook & Google", text: "Interne Termine per iCal importieren, Buchungen per iCal in Ihren Kalender exportieren." },
      { title: "Firmenangaben", text: "Firma und Kontaktdaten werden bei der Buchung erfasst; Belege weisen auf Wunsch die MWST aus." },
      { title: "Ausstattung", text: "Bildschirm, Videokonferenz, Whiteboard – Interessierte sehen sofort, was vorhanden ist." },
    ],
    body: [{ h: "Rechnung oder Onlinezahlung", p: "Viele Firmen bezahlen lieber per Rechnung. Pro Raum wählen Sie, ob online bei der Buchung oder per Rechnung bzw. vor Ort bezahlt wird. Offene Beträge sehen Sie im Dashboard." }],
    faq: [{ q: "Können interne Mitarbeitende den Raum blockieren?", a: "Ja – über Sperrzeiten im Dashboard oder automatisch über einen importierten Outlook- oder Google-Kalender." }],
  },
  {
    slug: "fotostudios",
    category: "fotostudio",
    name: "Fotostudios",
    metaTitle: "Fotostudio vermieten – Buchungssystem für Mietstudios",
    metaDescription: "Fotostudio stundenweise vermieten: Online-Buchung mit Equipment als Zusatzleistung, Pufferzeiten für Umbau, Onlinezahlung und QR-Code für Social Media.",
    headline: "Mietstudio buchen lassen, statt Termine abzustimmen",
    intro: "Fotografinnen, Content Creator und Agenturen buchen Studios kurzfristig und oft spontan. Mit Raumvia ist Ihr Studio direkt aus Instagram oder Google heraus buchbar – inklusive Equipment.",
    pains: ["Spontane Anfragen am Abend und Wochenende", "Equipment-Verleih separat abrechnen", "Umbauzeiten zwischen Shootings"],
    features: [
      { title: "Equipment als Zusatzleistung", text: "Blitzanlage, Hintergründe, Nebelmaschine – pro Buchung, pro Stunde oder pro Stück." },
      { title: "Umbauzeit", text: "Vorbereitungs- und Aufräumzeit werden automatisch eingeplant." },
      { title: "Link in Bio", text: "Buchungslink und QR-Code für Instagram, TikTok und Ihre Website." },
      { title: "Rabattcodes", text: "Codes für Stammkunden, Schulen oder Aktionen." },
    ],
    body: [{ h: "Randzeiten günstiger", p: "Mit Preisregeln machen Sie frühe Morgen- oder späte Abendstunden günstiger und lasten Ihr Studio besser aus." }],
    faq: [{ q: "Kann ich Mindestbuchungsdauern festlegen?", a: "Ja, z. B. mindestens 2 Stunden. Auch eine maximale Dauer ist möglich." }],
  },
  {
    slug: "proberaeume",
    category: "proberaum",
    name: "Proberäume",
    metaTitle: "Proberaum vermieten – Online-Buchung für Musik- und Bandräume",
    metaDescription: "Proberäume und Musikräume online vermieten: stundenweise Buchung, wiederkehrende Bands, Equipment, Kalender und Zahlung mit TWINT oder Karte.",
    headline: "Proberäume fair und einfach vergeben",
    intro: "Bands, Chöre, Musiklehrerinnen und DJs suchen Proberäume stundenweise. Raumvia zeigt freie Slots in Echtzeit und sorgt dafür, dass jede Stunde bezahlt ist, bevor jemand den Schlüssel braucht.",
    pains: ["WhatsApp-Gruppen voller Reservationen", "Unbezahlte Probestunden", "Equipment-Schäden und unklare Regeln"],
    features: [
      { title: "Stundenweise Slots", text: "Buchungen im Raster Ihrer Wahl, auch abends und nachts." },
      { title: "Backline als Zusatz", text: "Schlagzeug, Verstärker, PA – als Zusatzleistung buchbar." },
      { title: "Hausregeln", text: "Lautstärke, Ruhezeiten und Schlüsselregelung werden vor der Buchung bestätigt." },
      { title: "Bezahlt vor der Probe", text: "Karte oder TWINT direkt bei der Buchung." },
    ],
    body: [{ h: "Stammkunden", p: "Regelmässige Bands erhalten mit Rabattcodes Vorzugspreise. Wiederkehrende Serienbuchungen sind für eine spätere Version vorgesehen; bis dahin erfassen Sie fixe Termine direkt im Dashboard." }],
    faq: [{ q: "Kann ich mehrere Proberäume verwalten?", a: "Ja. Im Tarif Professional bis 5 Räume, im Tarif Business bis 25 Räume an mehreren Standorten." }],
  },
  {
    slug: "seminarraeume",
    category: "seminarraum",
    name: "Seminarräume",
    metaTitle: "Seminarraum vermieten – Buchungssoftware für Kursräume",
    metaDescription: "Seminar- und Kursräume halbtags oder ganztags online vermieten: Pauschalen, Verpflegung pro Person, Bestuhlung, Rechnung für Firmen und automatische Bestätigungen.",
    headline: "Seminar- und Kursräume professionell vermieten",
    intro: "Trainer, Firmen und Vereine planen Kurse oft Wochen im Voraus und brauchen klare Angaben zu Bestuhlung, Technik und Verpflegung. Raumvia bündelt alles auf einer Buchungsseite.",
    pains: ["Offerten für Halbtag und Tag", "Verpflegung pro Person rechnen", "Bestätigungen und Belege für die Buchhaltung"],
    features: [
      { title: "Halbtag & Tag", text: "Pauschalen werden automatisch angewendet, wenn sie günstiger sind." },
      { title: "Pro Person", text: "Kaffeepause oder Mittagessen pro Teilnehmerin – der Preis passt sich an." },
      { title: "Belege mit MWST", text: "Zahlungsbelege mit Firmenangaben und ausgewiesener MWST." },
      { title: "Mehrtägige Kurse", text: "Buchungen über mehrere Tage, sofern Ihre Öffnungszeiten das zulassen." },
    ],
    body: [{ h: "Technik und Bestuhlung", p: "Beschreiben Sie Bestuhlungsvarianten in der Raumbeschreibung und bieten Sie Technik wie Beamer oder Moderationskoffer als Zusatzleistung an." }],
    faq: [{ q: "Kann ich Firmen per Rechnung abrechnen?", a: "Ja. Wählen Sie für den Raum «Rechnung / vor Ort» und hinterlegen Sie Ihre Zahlungsangaben als Hinweis." }],
  },
  {
    slug: "tanzstudios",
    category: "tanzstudio",
    name: "Tanzstudios",
    metaTitle: "Tanzstudio und Yogaraum vermieten – Online-Raumbuchung",
    metaDescription: "Tanzstudios, Yoga- und Bewegungsräume stundenweise an Kursleitende vermieten: Echtzeit-Kalender, Randzeitenpreise, Onlinezahlung und Einbettung auf Ihrer Website.",
    headline: "Tanz- und Bewegungsräume besser auslasten",
    intro: "Zwischen Ihren eigenen Kursen steht der Saal oft leer. Vermieten Sie freie Stunden an Kursleitende, Tanzpaare oder Physiotherapeutinnen – mit einem Kalender, der Ihre eigenen Kurse automatisch berücksichtigt.",
    pains: ["Freie Stunden zwischen eigenen Kursen", "Abstimmung mit dem eigenen Stundenplan", "Kleinbeträge einfordern"],
    features: [
      { title: "Eigene Kurse blockieren", text: "Ihren Stundenplan aus Google oder Outlook importieren – diese Zeiten sind automatisch belegt." },
      { title: "Randzeiten", text: "Günstigere Preise am Vormittag, Zuschläge am Abend." },
      { title: "Website-Widget", text: "Das Buchungsformular direkt auf Ihrer Studio-Website." },
      { title: "Kleine Beträge online", text: "Auch eine Stunde für CHF 30.– wird bequem per TWINT oder Karte bezahlt." },
    ],
    body: [{ h: "Ausstattung zeigen", p: "Schwingboden, Spiegelwand, Musikanlage, Umkleide: Wählen Sie die Ausstattung aus der Liste und laden Sie Fotos hoch." }],
    faq: [{ q: "Eignet sich Raumvia auch für Yogaräume?", a: "Ja. Wählen Sie die Kategorie «Yoga- & Bewegungsraum»; alle Funktionen sind identisch." }],
  },
];

export const getSolution = (slug: string) => SOLUTIONS.find((s) => s.slug === slug);
