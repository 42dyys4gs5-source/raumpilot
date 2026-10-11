import { headers } from "next/headers";

export async function requestInfo(): Promise<{ ip: string; userAgent: string }> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip = (fwd ? fwd.split(",")[0] : h.get("x-real-ip")) ?? "unknown";
    return { ip: ip.trim().slice(0, 64), userAgent: (h.get("user-agent") ?? "").slice(0, 300) };
  } catch {
    return { ip: "unknown", userAgent: "" };
  }
}
