import { handleStripeWebhook } from "@/lib/payments/webhook-route";

export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return handleStripeWebhook(req, "platform");
}
