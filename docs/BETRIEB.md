# Betrieb und Produktivsetzung

Diese Anleitung führt Schritt für Schritt zur Live-Umgebung. Empfohlener Stack: **Vercel** (Hosting), **Supabase** (PostgreSQL + Dateispeicher, Region Zürich bzw. EU), **Stripe** (Abos + Connect), **Resend** (E-Mail), optional **Sentry** und **Cloudflare Turnstile**.

> Reihenfolge: Datenbank → Speicher → E-Mail → Hosting (zunächst `PAYMENTS_MODE=disabled`) → Stripe im Testmodus → Testbuchungen → Stripe live → Domain.

## 1. Datenbank (Supabase)

1. Projekt anlegen, Region **Zürich (eu-central-2)**, falls verfügbar, sonst Frankfurt.
2. *Database › Extensions*: `citext`, `btree_gist`, `pgcrypto` aktivieren.
3. Connection-String (Session-Pooler, Port 5432, `?sslmode=require`) als `DATABASE_URL` notieren. Für serverlose Last kann der Transaction-Pooler (Port 6543) verwendet werden – die App deaktiviert dann Prepared Statements automatisch.
4. Migrationen lokal gegen Produktion ausführen:
   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   DATABASE_URL="postgres://…" npm run db:seed-plans
   DATABASE_URL="postgres://…" npm run admin:create -- sie@domain.ch "Ihr Name"
   ```
5. Empfohlen: Supabase-Plan **Pro** (tägliche Backups, 7 Tage). Für Point-in-Time-Recovery das PITR-Add-on aktivieren.
6. Hinweis: Die App greift über einen eigenen Datenbankbenutzer zu, nicht über die öffentliche Supabase-API. Die Supabase-«Data API» (PostgREST) kann deaktiviert werden (*Settings › API*), da sie nicht benötigt wird – das verkleinert die Angriffsfläche.

## 2. Dateispeicher (Supabase Storage)

1. *Storage › New bucket* `media`, **Public bucket** aktivieren (Raumfotos sind öffentlich).
2. `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (nur serverseitig!) setzen.

## 3. E-Mail (Resend)

1. Domain `raumvia.ch` in Resend hinzufügen und die angezeigten DNS-Einträge (SPF, DKIM, optional DMARC) beim Domain-Anbieter eintragen.
2. API-Key erstellen → `RESEND_API_KEY`, `EMAIL_MODE=resend`, `EMAIL_FROM="Raumvia <info@raumvia.ch>"`, `EMAIL_REPLY_TO=info@raumvia.ch`.
3. `ADMIN_ALERT_EMAIL` auf Ihre Adresse setzen (Fehlerwarnungen, Monatsbericht, neue Supportanfragen).
4. Empfohlener DMARC-Eintrag: `_dmarc TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@raumvia.ch"`.

## 4. Hosting (Vercel)

1. Repository importieren, Framework «Next.js», Node 22.
2. Alle Variablen aus `.env.example` setzen (Production und Preview getrennt!). Geheimnisse erzeugen:
   ```bash
   openssl rand -base64 48   # APP_SECRET, CRON_SECRET
   openssl rand -base64 32   # ENCRYPTION_KEY (genau 32 Byte)
   ```
   **ENCRYPTION_KEY nie ändern**, sonst sind gespeicherte 2FA-Geheimnisse und Kalender-URLs nicht mehr lesbar. Sicher (z. B. Passwortmanager) aufbewahren.
3. Die App verweigert den Start in Produktion mit Entwicklungs-Standardwerten oder `PAYMENTS_MODE=fake`.
4. **Cron**: `vercel.json` ruft `/api/cron/run` alle 5 Minuten auf (Vercel sendet `Authorization: Bearer $CRON_SECRET` automatisch). Das setzt den Vercel-Plan **Pro** voraus (gewerbliche Nutzung erfordert ohnehin Pro). Alternative: GitHub-Workflow `cron.yml` (Repository-Variable `CRON_ENABLED=true`, Secrets `APP_URL`, `CRON_SECRET`) – beachten Sie die GitHub-Actions-Minuten.
5. Region `fra1` (Frankfurt) ist in `vercel.json` gesetzt – nahe an Supabase Zürich/Frankfurt.

## 5. Stripe

### 5.1 Plattformkonto (Abos)
1. Stripe-Konto für Ihre Firma (Sitz Schweiz) eröffnen und verifizieren.
2. *Produkte*: je ein Produkt «Raumvia Starter/Professional/Business» mit **monatlichem Preis in CHF** anlegen. Sind Sie MWST-pflichtig: Preise als «inklusive Steuern» und den Steuersatz 8.1 % hinterlegen (bzw. Stripe Tax aktivieren).
3. Preis-IDs (`price_…`) im Admin-Bereich unter *Tarife* eintragen.
4. *Einstellungen › Billing › Kundenportal*: Kündigung «am Ende des Abrechnungszeitraums», Tarifwechsel zwischen den drei Preisen erlauben, Zahlungsmittel-Aktualisierung erlauben.
5. *Einstellungen › Billing › Abonnements und E-Mails*: Smart Retries aktivieren, E-Mail-Belege und Rechnungen an Kunden senden, Hinweise auf ablaufende Karten aktivieren.
6. Webhook-Endpunkt `https://raumvia.ch/api/webhooks/stripe` mit den Ereignissen: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `invoice.finalized`, `invoice.updated`, `invoice.voided`, `account.updated`. Signing Secret → `STRIPE_WEBHOOK_SECRET`.

### 5.2 Connect (Zahlungen der Mieter)
1. *Connect* aktivieren, Plattformprofil ausfüllen (Geschäftsmodell: «Software-Plattform; Verkäufer sind die Vermieter, Direct Charges»).
2. Kontotyp: Die App erstellt Konten mit vollem Stripe-Dashboard, Gebühren und Verluste beim verbundenen Konto («Standard»-Konfiguration). Raumvia ist nicht Merchant of Record.
3. Zweiter Webhook-Endpunkt `https://raumvia.ch/api/webhooks/stripe-connect`, Option **«Ereignisse auf verbundenen Konten»**, Ereignisse: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `account.updated`. Secret → `STRIPE_CONNECT_WEBHOOK_SECRET`.
4. **TWINT**: wird pro verbundenem Konto in dessen Stripe-Einstellungen unter Zahlungsmethoden aktiviert (Konten in der Schweiz, CHF). Die App fordert die Capability `twint_payments` an und nutzt dynamische Zahlungsmethoden – TWINT erscheint automatisch, sobald aktiv. Bitte nach Livegang mit einem echten Konto verifizieren.
5. Zuerst mit **Testschlüsseln** (`sk_test_…`) und Stripe-Testkarten durchspielen (Abo abschliessen, Raum buchen, stornieren). Erst danach die Live-Schlüssel setzen. Der Admin-Bereich zeigt an, ob Test- oder Live-Schlüssel aktiv sind.
6. `PAYMENTS_MODE=stripe` setzen.

## 6. Domain und DNS

1. `raumvia.ch` registrieren (siehe OFFENE-PUNKTE).
2. In Vercel die Domain hinzufügen; beim Registrar `A`/`CNAME` gemäss Vercel-Anzeige setzen. SSL/HTTPS wird automatisch ausgestellt.
3. `www.raumvia.ch` auf `raumvia.ch` umleiten (in Vercel).
4. `APP_URL=https://raumvia.ch` setzen und neu deployen. Session-Cookies verwenden dann automatisch das `__Host-`-Präfix.

## 7. Optional

- **Turnstile** (Cloudflare, kostenlos): Site in Cloudflare anlegen, `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` setzen. Ohne Turnstile schützen Honeypot, Mindest-Ausfülldauer und Rate-Limits. Das Widget erscheint dann automatisch bei Registrierung, Kontakt und Buchung.
- **Sentry**: Projekt anlegen, `SENTRY_DSN` setzen. Fehler werden zusätzlich zum internen Fehlerprotokoll gemeldet.

## 8. Backups und Wiederherstellung

**Ebene 1 – Anbieter:** Supabase Pro erstellt tägliche Backups (7 Tage); mit PITR sekundengenaue Wiederherstellung.

**Ebene 2 – eigene, verschlüsselte Sicherung:** Workflow `.github/workflows/backup.yml` (Variable `BACKUP_ENABLED=true`, Secrets `DATABASE_URL`, `BACKUP_PASSPHRASE`, `APP_URL`, `CRON_SECRET`). Täglicher `pg_dump`, AES-256-verschlüsselt, 30 Tage als Artefakt. Jeder Lauf meldet sich bei `/api/cron/backup-report`; die tägliche Systemprüfung warnt per E-Mail, wenn 26 Stunden lang keine erfolgreiche Sicherung gemeldet wurde.

**Dateien:** Fotos liegen im Supabase-Bucket `media`. Für zusätzliche Sicherheit den Bucket periodisch mit `rclone` (S3-kompatibler Zugang von Supabase) auf einen zweiten Speicher kopieren.

### Wiederherstellung (Restore)
1. Wartungsfenster ankündigen; in Vercel die Umgebungsvariable `DATABASE_URL` vorerst unverändert lassen.
2. Neue Datenbank anlegen (Supabase-Projekt oder lokales PostgreSQL) und Erweiterungen aktivieren.
3. Sicherung herunterladen und entschlüsseln:
   ```bash
   gpg --decrypt raumvia-YYYYMMDDTHHMMSSZ.dump.gpg > restore.dump
   pg_restore --no-owner --no-privileges -d "$NEUE_DATABASE_URL" restore.dump
   DATABASE_URL="$NEUE_DATABASE_URL" npm run db:migrate   # bringt das Schema auf den aktuellen Stand
   ```
4. Stichprobe: Anzahl Buchungen/Organisationen vergleichen, Admin-Login testen.
5. `DATABASE_URL` in Vercel umstellen, neu deployen.
6. Stripe-Webhooks, die während des Ausfalls fehlgeschlagen sind, werden von Stripe bis zu 3 Tage wiederholt; die Verarbeitung ist idempotent. Bei Bedarf im Stripe-Dashboard manuell erneut senden.
7. Wiederherstellung mindestens einmal pro Quartal testweise durchspielen.

## 9. Laufender Betrieb

- **Täglich automatisch**: Systemprüfung (Datenbank, Jobs, Webhooks, Fehler, Backups) mit Warnung an `ADMIN_ALERT_EMAIL`, Aufräumen alter Sessions/Jobs/Protokolle.
- **Monatlich automatisch**: Bericht (MRR, Abos, Neukunden, Kündigungen, Umsatz, Buchungsvolumen) am 1. per E-Mail.
- **Admin-Bereich** `/admin`: Kennzahlen, Support, Fehler, Sicherheitsereignisse, Jobs (fehlgeschlagene erneut ausführen), Tarife.
- **Updates**: Push auf `main` → GitHub-Actions-CI (Typprüfung, Lint, Tests, Build, E2E) → Vercel-Deployment. Datenbankmigrationen vor dem Deployment mit `npm run db:migrate` ausführen (Migrationen sind additiv angelegt).
- **Schlüsselrotation**: `APP_SECRET` rotieren macht bestehende Kunden-Buchungslinks ungültig – nur bei Verdacht auf Kompromittierung. `CRON_SECRET` jederzeit (Vercel + GitHub gleichzeitig ändern).
