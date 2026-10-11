import type { Block } from "./types";

export type HelpArticle = { slug: string; title: string; summary: string; category: string; body: Block[] };

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "erste-schritte",
    category: "Start",
    title: "Erste Schritte: In 15 Minuten online buchbar",
    summary: "Vom Konto bis zum geteilten Buchungslink – Schritt für Schritt.",
    body: [
      { p: "Raumvia führt Sie nach der Registrierung mit einem Assistenten durch die Einrichtung. So gehen Sie vor:" },
      { ol: [
        "Registrieren Sie sich und bestätigen Sie Ihre E-Mail-Adresse.",
        "Erfassen Sie Ihren ersten Raum mit Name, Kategorie, Kapazität und einem Stundenpreis.",
        "Ergänzen Sie Fotos, Beschreibung, Öffnungszeiten, Hausregeln und Stornierungsbedingungen.",
        "Wählen Sie einen Tarif. Bis dahin bleibt Ihr Raum ein Entwurf.",
        "Veröffentlichen Sie den Raum unter «Meine Räume › Veröffentlichen».",
        "Teilen Sie Ihren Buchungslink oder QR-Code (Menü «Buchungsseite & QR-Code»).",
      ] },
      { note: "Tipp: Machen Sie eine Testbuchung über Ihre eigene Buchungsseite. Sie sehen dann genau, was Ihre Kundschaft erlebt – inklusive Bestätigungs-E-Mail. Testbuchungen können Sie anschliessend im Dashboard stornieren." },
    ],
  },
  {
    slug: "raum-erfassen",
    category: "Räume",
    title: "Einen Raum überzeugend präsentieren",
    summary: "Fotos, Beschreibung und Ausstattung, die zur Buchung führen.",
    body: [
      { h: "Fotos", ul: [
        "Laden Sie mindestens 3–6 Fotos hoch, idealerweise im Querformat.",
        "Das erste Foto ist das Titelbild. Die Reihenfolge ändern Sie mit den Pfeilen.",
        "Wir verkleinern Bilder automatisch, wandeln sie ins schnelle WebP-Format um und entfernen Metadaten wie GPS-Koordinaten.",
        "Beschreiben Sie jedes Foto kurz (Alternativtext). Das hilft Menschen mit Screenreadern und Suchmaschinen.",
      ] },
      { h: "Beschreibung", p: "Beantworten Sie die Fragen, die Ihnen sonst am Telefon gestellt werden: Wofür eignet sich der Raum? Wie viele Personen haben Platz – stehend, sitzend, in Reihen? Gibt es Lift, Parkplätze, eine Küche? Wie ist die Anreise mit dem ÖV?" },
      { h: "Ausstattung", p: "Wählen Sie die passenden Ausstattungsmerkmale aus. Fehlt etwas, ergänzen Sie es im Feld «Weitere Ausstattung», mit Komma getrennt." },
    ],
  },
  {
    slug: "preise-festlegen",
    category: "Preise",
    title: "Preise festlegen: Stunde, Halbtag, Tag und Zuschläge",
    summary: "Wie Raumvia den Mietpreis berechnet und wie Sie Wochenend- oder Saisonpreise einrichten.",
    body: [
      { p: "Pro Raum können Sie einen Stundenpreis, einen Halbtagespreis und einen Tagespreis festlegen. Bei jeder Buchung berechnet Raumvia automatisch den günstigsten passenden Preis." },
      { ul: [
        "Halbtag: gilt für Buchungen bis zur festgelegten Stundenzahl (Standard 5 Stunden).",
        "Tag: gilt für Buchungen bis zur festgelegten Stundenzahl (Standard 12 Stunden). Mehrtägige Buchungen werden pro angebrochenem Tag berechnet.",
        "Beispiel: Stunde CHF 50.–, Halbtag CHF 180.–. Eine 3-stündige Buchung kostet CHF 150.–, eine 5-stündige CHF 180.– statt CHF 250.–.",
      ] },
      { h: "Preisregeln (ab Professional)", p: "Unter «Preise» definieren Sie prozentuale Zu- oder Abschläge, z. B. «Wochenende +20 %» (Samstag/Sonntag), «Sommer –10 %» (Datumsbereich) oder «Abend +15 %» (ab 18:00). Bei Buchungen über Mitternacht wird jede Stunde nach der dann gültigen Regel berechnet. Mieterinnen und Mieter sehen Zuschläge transparent als eigene Zeile." },
      { h: "Rundung und MWST", p: "Beträge werden auf 5 Rappen gerundet. Sind Sie MWST-pflichtig, weisen Belege die enthaltene MWST aus (Einstellungen › Firma & Steuern)." },
    ],
  },
  {
    slug: "verfuegbarkeit",
    category: "Kalender",
    title: "Öffnungszeiten, Puffer und Sperrzeiten",
    summary: "Steuern Sie genau, wann Ihr Raum buchbar ist – auch über Mitternacht.",
    body: [
      { h: "Buchbare Zeiten", p: "Pro Wochentag legen Sie bis zu zwei Zeitfenster fest. Liegt das Ende vor dem Beginn (z. B. 18:00–02:00), läuft das Fenster bis in den Folgetag – ideal für Partyräume. Sommer- und Winterzeit werden automatisch berücksichtigt." },
      { h: "Mietdauer und Vorlauf", ul: [
        "Mindest- und Maximaldauer begrenzen, wie kurz oder lang gebucht werden kann.",
        "Die Mindestvorlaufzeit verhindert sehr kurzfristige Buchungen (z. B. 24 Stunden).",
        "«Buchbar bis … Tage im Voraus» begrenzt, wie weit in die Zukunft gebucht werden kann.",
      ] },
      { h: "Vorbereitungs- und Reinigungszeit", p: "Diese Puffer werden vor bzw. nach jeder Buchung automatisch blockiert. Beispiel: Reinigung 60 Minuten – endet eine Buchung um 17:00, ist der nächste Start frühestens um 18:00 möglich." },
      { h: "Sperrzeiten und Ferien", p: "Unter «Verfügbarkeit» sperren Sie einzelne Zeiten oder ganze Zeiträume für einen Raum oder alle Räume. Bestehende Buchungen bleiben dabei bestehen – Sie werden auf Überschneidungen hingewiesen." },
    ],
  },
  {
    slug: "sofortbuchung-oder-anfrage",
    category: "Buchungen",
    title: "Sofortbuchung oder Buchungsanfrage?",
    summary: "Welche Buchungsart passt zu Ihrem Raum?",
    body: [
      { h: "Sofortbuchung", p: "Freie Termine werden direkt verbindlich gebucht. Das ist für Kundinnen und Kunden am bequemsten und spart Ihnen Zeit. Geeignet für Sitzungszimmer, Proberäume, Studios und alle Räume mit klaren Regeln." },
      { h: "Buchungsanfrage", p: "Sie prüfen jede Anfrage und nehmen sie an oder lehnen sie ab. Der Termin bleibt bis zu Ihrer Entscheidung reserviert. Nach Ablauf der eingestellten Frist (Standard 48 Stunden) verfällt die Anfrage automatisch. Geeignet für Partyräume oder Eventlocations, bei denen Sie Anlass und Personen kennen möchten." },
      { p: "Ist Onlinezahlung aktiv, erhält die Kundschaft nach Ihrer Annahme automatisch einen Zahlungslink. Erst mit der Zahlung ist die Buchung bestätigt." },
    ],
  },
  {
    slug: "onlinezahlung",
    category: "Zahlungen",
    title: "Onlinezahlung mit Stripe, Karte und TWINT",
    summary: "So erhalten Sie Mietzahlungen direkt auf Ihr Konto.",
    body: [
      { p: "Raumvia nutzt Stripe für Onlinezahlungen. Sie verbinden Ihr eigenes Stripe-Konto; Zahlungen Ihrer Kundschaft gehen direkt an Sie. Raumvia ist nicht Zahlungsempfänger und hat keinen Zugriff auf Ihr Geld." },
      { h: "Einrichtung", ol: [
        "Menü «Zahlungen & Einnahmen» › «Stripe-Konto verbinden».",
        "Stripe fragt die gesetzlich vorgeschriebenen Angaben ab (Identität, Bankverbindung, ggf. Handelsregister).",
        "Nach der Prüfung erscheint der Status «Aktiv». Aktivieren Sie nun bei Ihren Räumen «Online bei Buchung».",
      ] },
      { h: "Zahlungsarten", p: "Kreditkarten und Debitkarten funktionieren sofort. TWINT erscheint im Zahlungsfenster, sobald Sie es in Ihrem Stripe-Dashboard unter «Einstellungen › Zahlungsmethoden» aktiviert haben (für Konten in der Schweiz und Zahlungen in CHF)." },
      { h: "Gebühren", p: "Stripe belastet Ihnen die Transaktionsgebühren gemäss Ihrem Stripe-Vertrag direkt. Raumvia verlangt derzeit keine zusätzliche Provision auf Buchungen." },
      { h: "Reservation während der Zahlung", p: "Während die Kundschaft bezahlt, ist der Termin 30 Minuten reserviert. Wird die Zahlung abgebrochen, wird er automatisch wieder freigegeben." },
    ],
  },
  {
    slug: "stornierung-und-rueckerstattung",
    category: "Buchungen",
    title: "Stornierungen und Rückerstattungen",
    summary: "Automatische Rückerstattungen nach Ihren Regeln.",
    body: [
      { p: "Pro Raum legen Sie fest, bis wann kostenlos storniert werden kann und ob es danach eine Teilrückerstattung gibt. Kundinnen und Kunden stornieren selbst über den Link in der Bestätigung und sehen vorher den Rückerstattungsbetrag." },
      { ul: [
        "Online bezahlte Beträge werden automatisch über Stripe zurückerstattet.",
        "Eine online bezahlte Kaution wird immer vollständig zurückerstattet.",
        "Stornieren Sie selbst, erhält die Kundschaft immer den vollen Betrag zurück.",
        "Teilrückerstattungen (z. B. Rückgabe der Kaution) lösen Sie in der Buchungsdetailansicht aus.",
      ] },
      { h: "Umbuchungen", p: "Kundinnen und Kunden können innerhalb der kostenlosen Stornierungsfrist selbst auf einen gleich teuren oder günstigeren Termin gleicher Dauer umbuchen. Sie selbst können Buchungen jederzeit verschieben." },
    ],
  },
  {
    slug: "kalender-synchronisieren",
    category: "Kalender",
    title: "Google, Outlook und Apple Kalender verbinden",
    summary: "Doppelbuchungen mit anderen Kalendern vermeiden.",
    body: [
      { h: "Buchungen in Ihrem Kalender anzeigen (Export)", p: "Jeder Raum hat einen geheimen iCal-Link (Verfügbarkeit › Kalender-Export). In Google Kalender wählen Sie «Weitere Kalender › Per URL», in Outlook «Kalender hinzufügen › Aus dem Internet abonnieren». Neue Buchungen erscheinen je nach Anbieter innert Minuten bis Stunden." },
      { h: "Externe Termine blockieren (Import)", p: "Unter «Verfügbarkeit › Externen Kalender importieren» fügen Sie die private iCal-Adresse eines anderen Kalenders ein (z. B. Google: «Privatadresse im iCal-Format»). Diese Termine blockieren Ihren Raum, der Abgleich erfolgt alle 30 Minuten." },
      { note: "Raumvia storniert nie automatisch eine bestätigte Buchung wegen eines externen Termins. Überschneidungen werden markiert und Ihnen per E-Mail gemeldet." },
    ],
  },
  {
    slug: "buchungsseite-teilen",
    category: "Marketing",
    title: "Buchungslink, QR-Code und Website-Widget",
    summary: "Wo und wie Sie Ihre Buchungsseite teilen.",
    body: [
      { ul: [
        "Google-Unternehmensprofil: als Link für Reservierungen bzw. Website.",
        "Instagram: im Profil-Link; WhatsApp Business: als Schnellantwort.",
        "QR-Code: als PNG für Flyer, Aushänge oder die Eingangstüre, als SVG für den Druck in jeder Grösse.",
        "Eigene Website: Fügen Sie das Widget mit zwei Zeilen HTML ein. Es passt sich automatisch in der Höhe an und funktioniert auf dem Smartphone.",
      ] },
      { p: "Für Website-Baukästen (Wix, Squarespace, WordPress, Jimdo) verwenden Sie ein «HTML/Embed»-Element. Funktioniert das nicht, nutzen Sie den einfachen Button-Link." },
    ],
  },
  {
    slug: "team-und-rollen",
    category: "Konto",
    title: "Team einladen und Rollen",
    summary: "Gemeinsam Buchungen verwalten (Tarif Business).",
    body: [
      { ul: [
        "Inhaber/in: voller Zugriff inkl. Abo, Stripe-Verbindung, Datenexport und Kontolöschung.",
        "Administrator/in: Räume, Preise, Einstellungen, Buchungen und Kunden.",
        "Mitarbeiter/in: Buchungen und Kunden ansehen und bearbeiten, Kalender nutzen.",
      ] },
      { p: "Einladungen gelten 7 Tage. Eingeladene Personen legen beim Annehmen ein eigenes Passwort fest." },
    ],
  },
  {
    slug: "abo-und-rechnung",
    category: "Konto",
    title: "Abo, Tarifwechsel und Kündigung",
    summary: "Alles zu Ihrem Raumvia-Abo.",
    body: [
      { ul: [
        "Abrechnung monatlich im Voraus per Karte. Rechnungen und Zahlungsbelege erhalten Sie per E-Mail und finden sie unter «Abonnement».",
        "Upgrades gelten sofort und werden anteilig verrechnet; Downgrades ebenso, sofern die Limiten (z. B. Anzahl Räume) eingehalten sind.",
        "Kündigung jederzeit zum Ende der bezahlten Laufzeit im Kundenportal. Bis dahin bleibt alles aktiv.",
        "Schlägt eine Zahlung fehl, versuchen wir es automatisch erneut und informieren Sie. In dieser Zeit bleibt Ihre Buchungsseite aktiv.",
      ] },
    ],
  },
  {
    slug: "datenschutz-fuer-vermieter",
    category: "Datenschutz",
    title: "Datenschutz: Ihre Pflichten und unsere Unterstützung",
    summary: "Wer ist verantwortlich, wie löschen und exportieren Sie Daten?",
    body: [
      { p: "Für die Daten Ihrer Mieterinnen und Mieter sind Sie Verantwortliche/r im Sinne des Schweizer Datenschutzgesetzes (DSG). Raumvia bearbeitet diese Daten in Ihrem Auftrag (Auftragsbearbeitung). Die Bedingungen dazu finden Sie in unserer Vereinbarung zur Auftragsbearbeitung." },
      { ul: [
        "Kundendaten löschen: Kunden › Person öffnen › «Kundendaten löschen». Buchungen bleiben anonymisiert für Ihre Buchhaltung erhalten.",
        "Datenexport: Einstellungen › Daten & Konto › «Export herunterladen».",
        "Erwähnen Sie die Nutzung von Raumvia in Ihrer eigenen Datenschutzerklärung.",
      ] },
    ],
  },
];

export const getArticle = (slug: string) => HELP_ARTICLES.find((a) => a.slug === slug);
