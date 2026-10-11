import { z } from "zod";

export const bookingRequestSchema = z.object({
  roomId: z.string().uuid(),
  start: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(60 * 24 * 14),
  guests: z.number().int().min(1).max(10000),
  extras: z.array(z.object({ extraId: z.string().uuid(), quantity: z.number().int().min(0).max(1000) })).max(50).default([]),
  discountCode: z.string().max(40).optional().nullable(),
});

export const bookingCreateSchema = bookingRequestSchema.extend({
  customer: z.object({
    name: z.string().trim().min(2, "Bitte geben Sie Ihren Namen an.").max(120),
    email: z.string().trim().toLowerCase().email("Bitte geben Sie eine gültige E-Mail-Adresse an.").max(200),
    phone: z.string().trim().max(40).optional().nullable(),
    company: z.string().trim().max(120).optional().nullable(),
    message: z.string().trim().max(2000).optional().nullable(),
  }),
  acceptTerms: z.literal(true, { message: "Bitte akzeptieren Sie die Mietbedingungen." }),
  source: z.enum(["online", "widget"]).default("online"),
  website_hp: z.string().max(0).optional(),
  turnstileToken: z.string().max(4000).optional().nullable(),
});
