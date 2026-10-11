# Sicherheit und Datenschutz

| Thema | Umsetzung | Ort |
|---|---|---|
| Passwörter | scrypt (N=2^15, r=8, p=1, 16-Byte-Salt), zeitkonstanter Vergleich, Mindestanforderungen | `lib/auth/password.ts` |
| Sessions | 256-bit Zufallstoken im `httpOnly`-, `Secure`-, `SameSite=Lax`-Cookie (`__Host-` unter HTTPS); in der DB nur SHA-256-Hash; 30 Tage gleitend; Abmeldung aller Geräte bei Passwortänderung | `lib/auth/session.ts` |
| Brute Force | Rate-Limits pro IP und E-Mail (Postgres-basiert, serverlos-tauglich), Kontosperre nach 10 Fehlversuchen (15 Min.), Audit-Log | `(auth)/actions.ts`, `lib/security/rate-limit.ts` |
| Konto-Enumeration | Identische Antworten bei «Passwort vergessen»; generische Login-Fehler | |
| E-Mail-/Reset-Token | Zufallstoken, nur Hash gespeichert, einmalig, ablaufend (48 h / 60 Min.), alte Tokens werden bei Neuausstellung ungültig | `lib/auth/tokens.ts` |
| 2FA | TOTP (RFC 6238, ±30 s), Geheimnis AES-256-GCM-verschlüsselt; **für Administratoren Pflicht**, für Vermieter optional | `lib/auth/totp.ts`, `requireAdmin()` |
| Rollen | owner/admin/staff pro Organisation, Plattform-Admin separat; serverseitig in jeder Action geprüft | `lib/auth/guards.ts` |
| Mandantentrennung | Jede Abfrage nach `org_id` gefiltert; Tests auf Daten- und HTTP-Ebene | siehe ARCHITEKTUR.md |
| CSRF | Server Actions: Next.js-Origin-Prüfung; JSON-APIs: strikte Origin-/Referer-Prüfung; Cookies `SameSite=Lax` | `lib/security/origin.ts` |
| XSS | React-Escaping, kein `dangerouslySetInnerHTML` ausser JSON-LD (mit `<`-Escaping); E-Mail-Vorlagen escapen alle Werte; CSP | `next.config.ts` |
| SQL-Injection | Ausschliesslich parametrisierte Abfragen (Drizzle / postgres.js Tagged Templates) | |
| Security-Header | CSP, HSTS (2 Jahre, preload), X-Frame-Options DENY (ausser `/embed`), nosniff, Referrer-Policy, Permissions-Policy | `next.config.ts` |
| Webhooks | Stripe-Signaturprüfung (5 Min. Toleranz gegen Replay), Idempotenz pro Ereignis, Prüfung des verbundenen Kontos | `lib/payments/webhook-route.ts` |
| Datei-Uploads | Inhaltsprüfung mit sharp (nicht Dateiendung), Grössen-/Pixellimit, Umwandlung in WebP, EXIF/GPS entfernt, zufällige Dateinamen | `lib/storage/images.ts` |
| SSRF (Kalenderimport) | Nur https/Port 443, DNS-Auflösung gegen private/Link-local/Metadaten-Adressen geprüft (auch bei Weiterleitungen), Timeout, 3-MB-Limit | `lib/calendar/fetch-safe.ts` |
| Verschlüsselung | TLS; AES-256-GCM für TOTP-Geheimnisse und private Kalender-URLs; Buchungslinks per HMAC signiert | `lib/security/crypto.ts` |
| Bots | Honeypot, Mindest-Ausfüllzeit, Rate-Limits, optional Cloudflare Turnstile | `lib/security/turnstile.ts` |
| CSV-Export | Schutz vor Formel-Injection | `api/export/payments` |
| Protokollierung | Audit-Log (Anmeldungen, Fehlversuche, Rollen, Exporte, Löschungen, Admin-Aktionen), Fehlerprotokoll + optional Sentry | Admin › Sicherheit / Fehler |
| Produktions-Schutz | App startet nicht mit Entwicklungs-Geheimnissen oder Test-Zahlungsmodus | `lib/env.ts` |

## Datenschutz (DSG/DSGVO)

- **Datensparsamkeit**: Mieter geben nur Name, E-Mail und optional Telefon/Firma/Nachricht an. Keine Tracking- oder Werbe-Cookies, keine Analyse-Tools.
- **Rollen**: Raumvia ist Verantwortliche für Vermieterdaten und Auftragsbearbeiterin für Mieterdaten (Vorlage AVV unter `/rechtliches/auftragsbearbeitung`).
- **Betroffenenrechte**: Datenexport (JSON) und Kontolöschung durch Vermieter selbst; Löschung/Anonymisierung einzelner Mieter durch Vermieter; Auskunftsanfragen über Support.
- **Aufbewahrung**: E-Mail-Protokolle 180 Tage (Inhalte nie in Produktion), Sessions bis Ablauf, erledigte Jobs 30 Tage.
- **Zahlungsdaten** verarbeitet ausschliesslich Stripe (PCI DSS); Raumvia speichert keine Kartendaten.

## Bekannte Restrisiken / Empfehlungen

- Datenbank-Row-Level-Security (RLS) ist nicht aktiviert; die Isolation erfolgt in der Anwendung (getestet). Für zusätzliche Tiefe kann RLS mit `SET app.org_id` pro Transaktion nachgerüstet werden.
- Vor Livegang: externer Penetrationstest bzw. mindestens `npm audit` und ein Review der Rechtsvorlagen.
- `ENCRYPTION_KEY` und `APP_SECRET` sicher verwahren (Verlust = 2FA/Kalender-URLs neu einrichten bzw. Buchungslinks ungültig).
