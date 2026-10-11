/** All amounts are integers in Rappen (1/100 CHF). */

export function formatMoney(rappen: number, currency = "CHF"): string {
  const neg = rappen < 0;
  const abs = Math.abs(rappen);
  const francs = Math.floor(abs / 100);
  const cents = abs % 100;
  const fr = francs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "’");
  const body = cents === 0 ? `${fr}.–` : `${fr}.${cents.toString().padStart(2, "0")}`;
  return `${neg ? "–" : ""}${currency} ${body}`;
}

/** Swiss commercial rounding to 5 Rappen. */
export function roundTo5(rappen: number): number {
  return Math.round(rappen / 5) * 5;
}

/** Parse user input like "120", "120.50", "120,5", "1'200.–" into Rappen. Returns null when invalid/empty. */
export function parseMoney(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = String(input).trim().replace(/[’'\s]/g, "").replace(/\.–$/, "").replace(",", ".");
  if (s === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

export function toInputValue(rappen: number | null | undefined): string {
  if (rappen == null) return "";
  return (rappen / 100).toFixed(2).replace(/\.00$/, "");
}

/** VAT contained in a gross amount (prices include VAT). */
export function vatFromGross(gross: number, rateBp: number): number {
  return Math.round((gross * rateBp) / (10000 + rateBp));
}
