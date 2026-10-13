import type { Block } from "./types";

/**
 * Ratgeber für Raumvermieterinnen und -vermieter (SEO-Inhalte).
 * Grundsatz: echte, hilfreiche Antworten auf Suchanfragen – keine dünnen Ortsseiten, keine erfundenen Marktzahlen.
 * Rechtliche Hinweise bleiben allgemein und verweisen auf Fachpersonen bzw. Gemeindereglemente.
 */
export type Guide = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  category: "Vermieten" | "Preise & Geld" | "Organisation";
  readMinutes: number;
  updated: string; // ISO date
  intro: string;
  body: Block[];
  faq: { q: string; a: string }[];
  /** Passende Branchenseiten unter /loesungen */
  solutions: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "partyraum-vermieten",
    title: "Partyraum vermieten: Preise, Regeln und Ablauf",
    metaTitle: "Partyraum vermieten in der Schweiz – Preise, Regeln, Ablauf",
    description: "So vermieten Sie Ihren Partyraum erfolgreich: Preise festlegen, Hausordnung und Kaution, Nachtruhe, Schlüsselübergabe und Online-Buchung – ein praktischer Leitfaden für die Schweiz.",
    category: "Vermieten",
    readMinutes: 6,
    updated: "2026-10-13",
    intro: "Geburtstage, Polterabende, Firmenfeiern: Ein gut organisierter Partyraum ist an vielen Wochenenden ausgebucht. Damit die Vermietung nicht zum Nebenjob wird, braucht es klare Preise, klare Regeln und einen einfachen Buchungsablauf.",
    body: [
      { h: "1. Wofür wird Ihr Raum gebucht?", p: "Überlegen Sie zuerst, für welche Anlässe Ihr Raum taugt: Kindergeburtstage am Nachmittag, private Feiern am Abend, Firmenanlässe unter der Woche. Davon hängen Öffnungszeiten, Preise und Regeln ab. Beschreiben Sie in Ihrem Inserat konkret, was möglich ist (Personenzahl, Musikanlage, Küche, Bestuhlung) – das spart Rückfragen." },
      { h: "2. Preise festlegen", p: "Partyräume werden meist pro Abend, pro Halbtag oder pro Stunde vermietet. Bewährt hat sich eine Kombination: ein Stundenpreis für kurze Anlässe und eine Pauschale für den ganzen Abend. Wochenenden sind gefragter – ein Wochenendzuschlag ist üblich. Rechnen Sie die Endreinigung entweder fix ein oder weisen Sie sie als separate Position aus." },
      { ul: ["Grundpreis pro Stunde oder Pauschale pro Abend/Tag", "Zuschlag für Freitag- und Samstagabend", "Endreinigung pauschal (oder Reinigung durch Mieter mit Kontrolle)", "Optionale Zusatzleistungen: Musikanlage, Geschirr, Tischwäsche, Deko"] },
      { h: "3. Kaution und Hausordnung", p: "Eine Kaution schützt Sie vor Schäden und ungeplantem Reinigungsaufwand. Halten Sie in einer kurzen Hausordnung fest, was gilt: Nachtruhe, Rauchverbot, Umgang mit Konfetti und Kerzen, Abfall, Rückgabezustand. Wichtig ist, dass Mieterinnen und Mieter die Regeln vor der Buchung sehen und bestätigen." },
      { h: "4. Nachtruhe und Nachbarn", p: "Die Nachtruhe ist in der Schweiz kommunal geregelt – häufig ab 22 Uhr, teilweise mit Ausnahmen am Wochenende. Prüfen Sie das Polizei- bzw. Lärmreglement Ihrer Gemeinde und schreiben Sie die Regel in die Hausordnung. Ein Endzeitpunkt (z. B. «Musik leise ab 22 Uhr, Raum verlassen bis 02 Uhr») verhindert Diskussionen." },
      { h: "5. Schlüssel und Übergabe", p: "Persönliche Übergaben kosten Zeit. Viele Vermieter nutzen Schlüsselboxen oder elektronische Schlösser und verschicken den Code erst nach bezahlter Buchung. Vereinbaren Sie eine kurze Abnahme danach – oder eine Fotodokumentation durch den Mieter." },
      { h: "6. Anfragen ohne E-Mail-Pingpong", p: "Der grösste Zeitfresser ist die Abklärung: «Ist der 14. noch frei?», «Was kostet das?», «Wie bezahle ich?». Mit einer Online-Buchungsseite sehen Interessierte freie Termine und den Preis sofort, akzeptieren Ihre Hausordnung und bezahlen direkt. Sie entscheiden selbst, ob Buchungen sofort gelten oder ob Sie jede Anfrage zuerst freigeben." },
      { note: "Tipp: Halten Sie Puffer zwischen zwei Anlässen frei (z. B. 1 Stunde für Reinigung). Raumvia blockiert solche Puffer automatisch, sodass sich Buchungen nie überschneiden." },
    ],
    faq: [
      { q: "Braucht es für die Vermietung eines Partyraums eine Bewilligung?", a: "Für die reine Raumvermietung in der Regel nicht. Bewilligungspflichtig können aber z. B. der Alkoholausschank gegen Entgelt, grosse öffentliche Anlässe oder eine Nutzungsänderung des Raums sein. Klären Sie das bei Ihrer Gemeinde ab." },
      { q: "Wie hoch sollte die Kaution sein?", a: "Das hängt von Ausstattung und Risiko ab. Üblich ist ein Betrag, der eine Zusatzreinigung und kleinere Schäden deckt. Wichtig: Die Höhe vorab klar kommunizieren und die Rückerstattung zeitnah nach der Abnahme veranlassen." },
      { q: "Soll ich Anfragen manuell freigeben?", a: "Bei Partyräumen ist das oft sinnvoll, weil Sie wissen möchten, wer feiert. Sie können pro Raum wählen: Sofortbuchung oder Anfrage mit Freigabe." },
    ],
    solutions: ["partyraeume", "eventraeume"],
  },
  {
    slug: "proberaum-vermieten",
    title: "Proberaum vermieten: Belegung, Preise und Zugang",
    metaTitle: "Proberaum vermieten – Stundenpreise, Belegung und Zugang organisieren",
    description: "Proberaum stundenweise oder fest an Bands vermieten? Wie Sie Preise, Belegungsplan, Schlüssel und Lärmschutz organisieren – mit Online-Buchung ohne Doppelbelegung.",
    category: "Vermieten",
    readMinutes: 5,
    updated: "2026-10-13",
    intro: "Proberäume sind begehrt – vor allem abends und am Wochenende. Wer stundenweise vermietet, kann einen Raum deutlich besser auslasten als mit einer einzigen Festmiete. Dafür braucht es aber einen verlässlichen Belegungsplan.",
    body: [
      { h: "Festmiete oder stundenweise?", p: "Viele Proberäume werden an eine oder mehrere Bands fest vermietet, die sich die Zeiten teilen. Das ist einfach, aber der Raum steht oft leer. Stundenweise Vermietung bringt mehr Auslastung und spricht auch Solo-Musikerinnen, Lehrpersonen und Projektbands an. Ein Mittelweg: feste Slots für Stammbands, freie Zeiten für alle anderen." },
      { h: "Preise und Mindestdauer", p: "Üblich sind Stundenpreise mit einer Mindestdauer von 1–2 Stunden. Für Stammkundschaft eignen sich Rabattcodes (in Raumvia ab Tarif Professional). Abend- und Wochenendzeiten können teurer sein als Nachmittage unter der Woche." },
      { ul: ["Stundenpreis mit Mindestdauer (z. B. 2 Stunden)", "Rabatt für Stammbands per Gutscheincode", "Optionale Extras: Drumset, Backline, Aufnahmegerät", "Klare Regeln zu Lautstärke und Zeiten"] },
      { h: "Zugang ohne Schlüsselübergabe", p: "Für stundenweise Vermietung sind Schlüsselbox oder Code-Schloss fast unverzichtbar. Den Code verschicken Sie mit der Buchungsbestätigung – idealerweise erst, wenn die Buchung bezahlt ist." },
      { h: "Lärmschutz und Hausregeln", p: "Halten Sie Ruhezeiten fest und prüfen Sie das Lärmreglement Ihrer Gemeinde. Hausregeln wie «Türen geschlossen halten», «Equipment nicht verschieben» oder «Raum aufgeräumt verlassen» gehören in die Buchungsbedingungen." },
      { h: "Belegungsplan, der sich selbst führt", p: "Ein gemeinsamer Kalender in der Excel-Tabelle oder im Gruppenchat führt fast zwangsläufig zu Doppelbelegungen. Eine Online-Buchung zeigt nur tatsächlich freie Zeiten und bestätigt automatisch. Bestehende Kalender (z. B. Google oder Outlook) lassen sich per iCal einbinden, sodass private Termine ebenfalls blockiert werden." },
    ],
    faq: [
      { q: "Wie verhindere ich, dass zwei Bands gleichzeitig buchen?", a: "Mit einem System, das Termine beim Buchen verbindlich reserviert. Raumvia prüft die Verfügbarkeit in der Datenbank selbst – zwei gleichzeitige Buchungen für denselben Slot sind technisch ausgeschlossen." },
      { q: "Können Stammbands günstiger buchen?", a: "Ja, zum Beispiel mit einem persönlichen Gutscheincode mit Prozent- oder Frankenrabatt (ab Tarif Professional)." },
    ],
    solutions: ["proberaeume"],
  },
  {
    slug: "seminarraum-vermieten",
    title: "Seminarraum vermieten: Pakete, Ausstattung und Preise",
    metaTitle: "Seminarraum vermieten – Halbtages- und Tagespauschalen richtig gestalten",
    description: "Wie Sie Ihren Seminar- oder Schulungsraum erfolgreich vermieten: Halbtages- und Tagespauschalen, Ausstattung, Verpflegung als Zusatzleistung und Rechnung für Firmen.",
    category: "Vermieten",
    readMinutes: 5,
    updated: "2026-10-13",
    intro: "Firmen, Trainerinnen und Vereine suchen Seminarräume meist für einen Halbtag oder einen ganzen Tag. Wer klare Pakete anbietet und Firmen eine saubere Rechnung liefert, wird häufiger gebucht.",
    body: [
      { h: "Halbtag, Tag oder Stunde", p: "Für Seminarräume haben sich Halbtages- und Tagespauschalen durchgesetzt. Ergänzen Sie einen Stundenpreis für kurze Sitzungen. Ein gutes Buchungssystem wählt automatisch den günstigsten Tarif – bucht jemand 5 Stunden, kann die Halbtagespauschale günstiger sein als 5 Einzelstunden." },
      { h: "Ausstattung klar benennen", p: "Beamer oder Bildschirm, Flipchart, WLAN, Moderationskoffer, Bestuhlungsvarianten und maximale Personenzahl gehören in jede Raumbeschreibung. Gute Fotos des eingerichteten Raums sind wichtiger als Text." },
      { h: "Verpflegung und Extras", p: "Kaffee, Gipfeli, Mittagessen oder Getränkepauschale lassen sich als Zusatzleistungen pro Person oder pauschal anbieten. So sieht der Kunde den Gesamtpreis sofort, statt eine Offerte abzuwarten (Zusatzleistungen in Raumvia ab Tarif Professional)." },
      { h: "Firmenkunden: Rechnung statt Karte", p: "Viele Firmen bezahlen lieber auf Rechnung. Erlauben Sie wahlweise Onlinezahlung oder Zahlung per Rechnung bzw. vor Ort und markieren Sie bezahlte Buchungen im System. Firmenname und Rechnungsadresse sollten im Buchungsformular erfasst werden." },
      { h: "Auslastung erhöhen", p: "Seminarräume sind oft unter der Woche tagsüber gebucht und abends oder am Wochenende frei. Prüfen Sie, ob der Raum in diesen Zeiten für Kurse, Workshops oder Vereinssitzungen zu einem tieferen Preis vermietet werden kann." },
    ],
    faq: [
      { q: "Kann ich Halbtag und Tag unterschiedlich lang definieren?", a: "Ja. In Raumvia legen Sie fest, wie viele Stunden ein Halbtag bzw. Tag umfasst, und hinterlegen die jeweiligen Pauschalen." },
      { q: "Erhalten Firmen eine Rechnung?", a: "Bei Onlinezahlung erhalten Kunden automatisch einen Zahlungsbeleg. Alternativ können Sie Zahlung per Rechnung wählen und die Buchung nach Zahlungseingang als bezahlt markieren." },
    ],
    solutions: ["seminarraeume", "sitzungszimmer"],
  },
  {
    slug: "raum-stundenweise-vermieten",
    title: "Raum stundenweise vermieten: So lohnt es sich",
    metaTitle: "Raum stundenweise vermieten – Leitfaden für Einsteiger",
    description: "Sie haben einen Raum, der oft leer steht? So vermieten Sie ihn stundenweise: geeignete Räume, Preise, Regeln, Versicherung, Zahlungen und die wichtigsten Fehler.",
    category: "Vermieten",
    readMinutes: 6,
    updated: "2026-10-13",
    intro: "Ein Büro, das abends leer steht, ein Atelier, ein Vereinslokal oder ein Studio: Viele Räume werden nur einen Bruchteil der Zeit genutzt. Stundenweise Vermietung macht daraus eine regelmässige Einnahme – wenn der Aufwand klein bleibt.",
    body: [
      { h: "Welche Räume eignen sich?", ul: ["Sitzungszimmer und Büros (abends, am Wochenende)", "Ateliers, Fotostudios und Werkstätten", "Vereinslokale, Gemeinschafts- und Kirchgemeinderäume", "Tanz-, Yoga- und Bewegungsräume", "Proberäume und Musikzimmer"] },
      { h: "Vorher klären", p: "Prüfen Sie, ob Ihr Miet- oder Stockwerkeigentumsvertrag die Untervermietung bzw. Drittnutzung erlaubt, und informieren Sie Ihre Versicherung (Betriebs- bzw. Gebäudehaftpflicht). Bei Anlässen mit Publikum oder Ausschank können kommunale Bewilligungen nötig sein." },
      { h: "Preis finden", p: "Schauen Sie, was vergleichbare Räume in Ihrer Region kosten, und rechnen Sie Ihre Fixkosten (Miete, Nebenkosten, Reinigung) auf die realistisch vermietbaren Stunden um. Starten Sie lieber etwas tiefer und erhöhen Sie, sobald der Raum regelmässig ausgebucht ist." },
      { h: "Aufwand klein halten", p: "Der Erfolg steht und fällt mit dem Aufwand pro Buchung. Automatisieren Sie, was geht: Online-Kalender mit freien Zeiten, verbindliche Buchung mit Hausregeln, Zahlung im Voraus, automatische Bestätigung und Erinnerung, Zugang per Code." },
      { h: "Die häufigsten Fehler", ul: ["Kein Puffer zwischen zwei Buchungen für Reinigung", "Hausregeln erst nach der Buchung kommuniziert", "Bezahlung erst nach dem Anlass", "Kalender an mehreren Orten geführt – Doppelbuchungen", "Keine klare Stornierungsregel"] },
      { note: "Mit Raumvia erhalten Sie eine eigene Buchungsseite mit QR-Code und Website-Knopf. Mieter buchen und bezahlen online, Sie werden nur noch benachrichtigt." },
    ],
    faq: [
      { q: "Muss ich die Einnahmen versteuern?", a: "Ja, Einnahmen aus Raumvermietung sind steuerbares Einkommen. Ob und wie Mehrwertsteuer anfällt, hängt von Ihrem Umsatz und der Art der Vermietung ab – klären Sie das mit Ihrer Treuhänderin oder der ESTV." },
      { q: "Wie gehe ich mit Absagen um?", a: "Legen Sie eine Stornierungsregel fest, z. B. kostenlos bis 72 Stunden vorher, danach teilweise Rückerstattung. Raumvia berechnet die Rückerstattung automatisch nach Ihrer Regel." },
    ],
    solutions: ["sitzungszimmer", "fotostudios", "gemeinschaftsraeume"],
  },
  {
    slug: "mietpreis-raum-festlegen",
    title: "Mietpreis für Ihren Raum festlegen: Stunde, Halbtag, Tag",
    metaTitle: "Mietpreis für Räume festlegen – Stunden-, Halbtages- und Tagespreise",
    description: "Wie viel soll Ihr Raum kosten? Methoden zur Preisfindung, Stunden- vs. Pauschalpreise, Wochenend- und Saisonzuschläge, Zusatzleistungen und Rabatte – verständlich erklärt.",
    category: "Preise & Geld",
    readMinutes: 6,
    updated: "2026-10-13",
    intro: "Ein zu hoher Preis schreckt ab, ein zu tiefer lohnt sich nicht und zieht die falsche Kundschaft an. Diese Schritte helfen, einen fairen und rentablen Mietpreis zu finden.",
    body: [
      { h: "1. Kosten pro Stunde berechnen", p: "Addieren Sie Ihre monatlichen Kosten für den Raum (Miete oder Anteil, Nebenkosten, Reinigung, Versicherung, Software) und teilen Sie sie durch die Stunden, die Sie realistisch vermieten können. Das ist Ihre Untergrenze." },
      { h: "2. Mit vergleichbaren Räumen vergleichen", p: "Suchen Sie Inserate ähnlicher Räume in Ihrer Region (gleiche Grösse, Ausstattung, Lage). Liegen Sie deutlich darüber, braucht es gute Gründe – etwa bessere Ausstattung oder einfachere Buchung." },
      { h: "3. Preisstruktur wählen", ul: ["Stundenpreis: flexibel, ideal für Sitzungen, Proben, Kurse", "Halbtagespauschale: beliebt bei Seminaren und Workshops", "Tagespauschale: für Events, Shootings, Klausuren", "Abend- oder Wochenendpauschale: für Partys und Feiern"] },
      { p: "Bieten Sie mehrere Varianten an, sollte der Kunde automatisch die günstigste erhalten. Das schafft Vertrauen und vermeidet Nachfragen." },
      { h: "4. Zuschläge und Rabatte", p: "Wochenenden, Abende und Hochsaison (z. B. Dezember für Firmenfeiern) vertragen höhere Preise. Umgekehrt füllen Rabatte für Randzeiten oder Stammkunden Lücken im Kalender. Halten Sie solche Regeln einfach und transparent." },
      { h: "5. Zusatzleistungen getrennt ausweisen", p: "Reinigung, Technik, Verpflegung oder Material als separate Positionen machen den Grundpreis attraktiver und den Endpreis nachvollziehbar." },
      { h: "6. Regelmässig überprüfen", p: "Schauen Sie alle paar Monate auf Ihre Auslastung: Sind beliebte Zeiten immer ausgebucht, ist der Preis eher zu tief. Bleiben Zeiten trotz Nachfrage leer, prüfen Sie Preis, Fotos und Beschreibung." },
    ],
    faq: [
      { q: "Sollen Preise inkl. MWST angegeben werden?", a: "Gegenüber Privatpersonen sind in der Schweiz Endpreise (inkl. allfälliger MWST) anzugeben. Ob Ihre Raumvermietung mehrwertsteuerpflichtig ist, klären Sie am besten mit Ihrer Treuhänderin." },
      { q: "Rechnet Raumvia Wochenendzuschläge automatisch?", a: "Ja, ab Tarif Professional. Sie hinterlegen Preisregeln für Wochentage, Zeiten oder Saisons, und der Preis wird bei der Buchung automatisch berechnet und auf 5 Rappen gerundet." },
    ],
    solutions: ["eventraeume", "seminarraeume", "partyraeume"],
  },
  {
    slug: "kaution-raumvermietung",
    title: "Kaution bei der Raumvermietung: Höhe, Einzug, Rückgabe",
    metaTitle: "Kaution bei der Raumvermietung – Höhe, Einzug und Rückerstattung",
    description: "Wann lohnt sich eine Kaution bei der Vermietung von Event- und Partyräumen? Wie hoch sie sein sollte, wie Sie sie einziehen und wann Sie sie zurückerstatten.",
    category: "Preise & Geld",
    readMinutes: 4,
    updated: "2026-10-13",
    intro: "Eine Kaution schützt vor Schäden, fehlender Reinigung oder verlorenen Schlüsseln. Sie sollte aber einfach abzuwickeln sein – für Sie und für die Mieter.",
    body: [
      { h: "Wann braucht es eine Kaution?", p: "Bei Partyräumen, Eventlocations und Räumen mit wertvoller Ausstattung ist eine Kaution üblich. Bei Sitzungszimmern oder kurzen Proben wird oft darauf verzichtet." },
      { h: "Wie hoch?", p: "Die Kaution sollte die typischen Risiken abdecken: eine Zusatzreinigung, kleinere Schäden, einen verlorenen Schlüssel. Zu hohe Kautionen schrecken ab. Kommunizieren Sie den Betrag vor der Buchung." },
      { h: "Bar, Überweisung oder online?", p: "Barkautionen erfordern eine persönliche Übergabe und Quittungen. Überweisungen müssen kontrolliert und manuell zurückgezahlt werden. Am einfachsten ist die Kaution online zusammen mit der Miete – die Rückerstattung erfolgt dann mit einem Klick auf dasselbe Zahlungsmittel." },
      { h: "Rückerstattung", p: "Erstatten Sie die Kaution zeitnah nach der Abnahme zurück. Halten Sie Mängel mit Fotos fest und informieren Sie den Mieter, falls Sie einen Teil einbehalten. Die Grundlage dafür sind die Mietbedingungen, die der Mieter bei der Buchung akzeptiert hat." },
    ],
    faq: [
      { q: "Kann ich einen Teil der Kaution einbehalten?", a: "Ja, wenn Ihre Mietbedingungen das vorsehen und ein Schaden oder Mehraufwand nachweisbar ist. Dokumentieren Sie den Zustand vor und nach der Vermietung." },
      { q: "Wird eine online bezahlte Kaution bei Stornierung zurückerstattet?", a: "In Raumvia wird eine online bezahlte Kaution bei einer Stornierung immer vollständig zurückerstattet – unabhängig von der Stornierungsregel für den Mietpreis." },
    ],
    solutions: ["partyraeume", "eventraeume"],
  },
  {
    slug: "hausordnung-mietbedingungen",
    title: "Hausordnung und Mietbedingungen für Mieträume: Checkliste",
    metaTitle: "Hausordnung für Partyraum & Mietraum – Checkliste Mietbedingungen",
    description: "Was in eine Hausordnung und in Mietbedingungen für Event-, Party- und Seminarräume gehört: Checkliste mit Nutzung, Zeiten, Reinigung, Haftung, Stornierung und Kaution.",
    category: "Organisation",
    readMinutes: 5,
    updated: "2026-10-13",
    intro: "Klare Regeln vermeiden Streit. Die besten Regeln nützen aber nichts, wenn Mieter sie erst beim Schlüsselabholen sehen. Diese Checkliste hilft beim Formulieren – und beim richtigen Zeitpunkt.",
    body: [
      { h: "Hausordnung: Nutzung im Raum", ul: ["Erlaubte Nutzung und maximale Personenzahl", "Nachtruhe und Lautstärke (gemäss Gemeindereglement)", "Rauchen, Kerzen, Pyrotechnik, Konfetti", "Essen, Getränke, Alkohol", "Haustiere", "Abfall und Recycling", "Rückgabezustand: Möbel, Geschirr, Licht, Fenster"] },
      { h: "Mietbedingungen: das Vertragliche", ul: ["Mietdauer inkl. Auf- und Abbau", "Preis, Zusatzleistungen und Zahlungsfrist", "Kaution und Bedingungen für Einbehalt", "Stornierung und Rückerstattung", "Haftung für Schäden und Diebstahl", "Schlüssel, Code und Zugang", "Hausrecht bei Verstössen"] },
      { h: "Zum richtigen Zeitpunkt zeigen", p: "Mieter sollten Hausordnung und Mietbedingungen vor der verbindlichen Buchung sehen und ausdrücklich akzeptieren. Bei der Online-Buchung geschieht das mit einem Häkchen – der Zeitpunkt wird dokumentiert." },
      { note: "Diese Checkliste ersetzt keine Rechtsberatung. Für verbindliche Mietbedingungen lohnt sich eine kurze Prüfung durch eine Fachperson." },
    ],
    faq: [
      { q: "Wo hinterlege ich Hausordnung und Mietbedingungen in Raumvia?", a: "Pro Raum unter «Regeln & Stornierung». Sie erscheinen auf der Buchungsseite und müssen vor der Buchung akzeptiert werden." },
    ],
    solutions: ["partyraeume", "eventraeume", "gemeinschaftsraeume"],
  },
  {
    slug: "doppelbuchungen-vermeiden",
    title: "Doppelbuchungen vermeiden: Kalender, Puffer und Online-Buchung",
    metaTitle: "Doppelbuchungen vermeiden – so organisieren Sie Ihren Raumkalender",
    description: "Warum Doppelbuchungen entstehen und wie Sie sie verhindern: ein einziger Kalender, Puffer für Reinigung, Synchronisation mit Google/Outlook und verbindliche Online-Reservation.",
    category: "Organisation",
    readMinutes: 4,
    updated: "2026-10-13",
    intro: "Nichts ist peinlicher, als zwei Gruppen gleichzeitig vor derselben Tür. Doppelbuchungen passieren fast immer aus denselben Gründen – und lassen sich mit wenigen Massnahmen vermeiden.",
    body: [
      { h: "Woher Doppelbuchungen kommen", ul: ["Mehrere Kalender (Papier, Excel, Handy, Chat)", "Mehrere Personen nehmen Buchungen entgegen", "Zusagen per Telefon, Eintrag später vergessen", "Kein Puffer für Auf- und Abbau oder Reinigung", "Zwei Anfragen gleichzeitig für denselben Termin"] },
      { h: "Ein Kalender für alles", p: "Führen Sie genau einen verbindlichen Kalender. Private oder andere Termine, die Sie in Google, Outlook oder Apple Kalender führen, binden Sie per iCal ein, damit sie die Verfügbarkeit automatisch blockieren." },
      { h: "Puffer einplanen", p: "Legen Sie Vor- und Nachbereitungszeiten fest. Bei Partyräumen ist eine Stunde nach dem Anlass für Reinigung üblich, bei Sitzungszimmern reichen oft 15 Minuten." },
      { h: "Verbindlich reservieren", p: "Der kritische Moment ist, wenn zwei Personen gleichzeitig denselben Termin wollen. Ein gutes Buchungssystem reserviert den Termin in dem Moment, in dem jemand bucht, und hält ihn während der Zahlung fest. Raumvia stellt das direkt in der Datenbank sicher – zwei überschneidende Buchungen können gar nicht gespeichert werden." },
    ],
    faq: [
      { q: "Kann ich meinen Google-Kalender anbinden?", a: "Ja. Raumvia importiert externe Kalender per iCal-Link und exportiert Ihre Buchungen ebenfalls als iCal-Feed für Google, Outlook oder Apple." },
    ],
    solutions: ["sitzungszimmer", "proberaeume", "tanzstudios"],
  },
  {
    slug: "vereinslokal-vermieten",
    title: "Vereinslokal und Gemeinschaftsraum vermieten",
    metaTitle: "Vereinslokal, Quartiertreff oder Gemeinschaftsraum vermieten – einfach organisiert",
    description: "Wie Vereine, Genossenschaften und Kirchgemeinden ihre Räume einfach vermieten: Mitgliederpreise, Freigabe durch den Vorstand, Schlüssel, Reinigung und Zahlungen ohne Kassieraufwand.",
    category: "Vermieten",
    readMinutes: 5,
    updated: "2026-10-13",
    intro: "Vereinslokale, Quartiertreffs, Gemeinschaftsräume in Genossenschaften oder Kirchgemeindesäle werden oft ehrenamtlich verwaltet. Eine einfache Online-Buchung entlastet die zuständige Person spürbar.",
    body: [
      { h: "Typische Herausforderungen", ul: ["Buchungen laufen über eine einzelne Person (und deren Ferien)", "Unterschiedliche Preise für Mitglieder und externe Mieter", "Kassieren und Kontrolle der Zahlungen", "Schlüsselübergabe und Reinigung"] },
      { h: "Mitgliederpreise mit Codes", p: "Statt zwei Preislisten zu führen, erhalten Mitglieder einen Gutscheincode mit Rabatt (in Raumvia ab Tarif Professional). Externe Mieter zahlen den regulären Preis." },
      { h: "Freigabe durch den Vorstand", p: "Wenn jede Vermietung bewilligt werden muss, nutzen Sie Buchungsanfragen: Der Termin wird reserviert, die zuständige Person gibt frei oder lehnt ab, und der Mieter erhält automatisch Bescheid. Mehrere Personen können über Teamzugänge mitarbeiten (Tarif Business)." },
      { h: "Zahlung ohne Kassieraufwand", p: "Onlinezahlung bei der Buchung erspart das Kontrollieren von Einzahlungen. Alternativ bleibt die Zahlung per Rechnung oder vor Ort möglich – bezahlte Buchungen werden im System markiert." },
      { h: "Transparenz für Mitglieder", p: "Ein öffentlicher Belegungskalender zeigt allen, wann der Raum frei ist – ohne dass jemand nachfragen muss. Private Details der Mieter bleiben dabei verborgen." },
    ],
    faq: [
      { q: "Können mehrere Vorstandsmitglieder die Buchungen verwalten?", a: "Ja, mit Teamzugängen im Tarif Business und Rollen für Inhaber, Administratoren und Mitarbeitende. Im Tarif Starter und Professional verwaltet eine Person das Konto." },
      { q: "Ist das auch für kleine Vereine bezahlbar?", a: "Der Tarif Starter für einen Raum kostet CHF 39 pro Monat und ist monatlich kündbar; neue Konten starten mit einer kostenlosen Testphase. Rabattcodes für Mitglieder gibt es ab Professional (CHF 69)." },
    ],
    solutions: ["gemeinschaftsraeume"],
  },
];

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
export const guidesForSolution = (solutionSlug: string) => GUIDES.filter((g) => g.solutions.includes(solutionSlug));
