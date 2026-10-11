import { BRAND } from "@/config/brand";
import { appUrl } from "@/lib/env";

export function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailContent = { subject: string; html: string; text: string };

type Block =
  | { p: string }
  | { button: { label: string; url: string } }
  | { table: [string, string][] }
  | { note: string }
  | { heading: string };

/**
 * Builds a branded, client-safe HTML e-mail (table layout, inline styles) plus a plain-text alternative.
 * All dynamic values must be passed through the blocks – they are escaped here.
 */
export function renderEmail(opts: {
  subject: string;
  preheader?: string;
  title: string;
  blocks: Block[];
  footer?: string;
  brandName?: string;
  accentColor?: string;
}): EmailContent {
  const color = opts.accentColor && /^#[0-9a-f]{6}$/i.test(opts.accentColor) ? opts.accentColor : BRAND.primary;
  const text: string[] = [opts.title, ""];
  const html: string[] = [];
  for (const b of opts.blocks) {
    if ("p" in b) {
      html.push(`<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2a27">${esc(b.p).replace(/\n/g, "<br>")}</p>`);
      text.push(b.p, "");
    } else if ("heading" in b) {
      html.push(`<h2 style="margin:24px 0 8px;font-size:16px;color:#1f2a27">${esc(b.heading)}</h2>`);
      text.push(b.heading.toUpperCase(), "");
    } else if ("button" in b) {
      html.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:8px;background:${color}"><a href="${esc(b.button.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${esc(b.button.label)}</a></td></tr></table>`,
      );
      text.push(`${b.button.label}: ${b.button.url}`, "");
    } else if ("table" in b) {
      html.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;border:1px solid #e3e8e6;border-radius:8px;border-collapse:separate">` +
          b.table
            .map(
              ([k, v], i) =>
                `<tr><td style="padding:10px 14px;font-size:14px;color:#5b6b66;${i ? "border-top:1px solid #e3e8e6;" : ""}width:40%">${esc(k)}</td><td style="padding:10px 14px;font-size:14px;color:#1f2a27;font-weight:600;${i ? "border-top:1px solid #e3e8e6;" : ""}">${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
            )
            .join("") +
          `</table>`,
      );
      for (const [k, v] of b.table) text.push(`${k}: ${v}`);
      text.push("");
    } else if ("note" in b) {
      html.push(`<p style="margin:0 0 16px;padding:12px 14px;background:#f4f7f6;border-radius:8px;font-size:13px;line-height:1.5;color:#5b6b66">${esc(b.note).replace(/\n/g, "<br>")}</p>`);
      text.push(b.note, "");
    }
  }
  const footer = opts.footer ?? `Diese Nachricht wurde automatisch von ${BRAND.name} versendet.`;
  text.push("—", footer, appUrl());
  const brand = esc(opts.brandName ?? BRAND.name);
  const page = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader ?? "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
<tr><td style="padding:8px 4px 16px;font-size:18px;font-weight:700;color:${color}">${brand}</td></tr>
<tr><td style="background:#ffffff;border-radius:12px;padding:28px 28px 12px;border:1px solid #e3e8e6">
<h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:#1f2a27">${esc(opts.title)}</h1>
${html.join("\n")}
</td></tr>
<tr><td style="padding:16px 4px;font-size:12px;line-height:1.5;color:#7a8a85">${esc(footer)}<br><a href="${esc(appUrl())}" style="color:#7a8a85">${esc(BRAND.domain)}</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: opts.subject, html: page, text: text.join("\n") };
}
