import { and, eq, gt, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { sha256 } from "@/lib/security/crypto";
import { acceptInviteAction } from "@/app/app/(main)/einstellungen/actions";

export const metadata: Metadata = { title: "Einladung", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [row] = await db
    .select({ inv: schema.invitations, org: schema.organizations.name })
    .from(schema.invitations)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.invitations.orgId))
    .where(and(eq(schema.invitations.tokenHash, sha256(token)), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, new Date())));
  if (!row) return <Alert tone="error" title="Einladung ungültig oder abgelaufen">Bitten Sie um eine neue Einladung.</Alert>;
  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, row.inv.email));
  const s = await getSession();
  return (
    <>
      <h1 className="text-2xl font-semibold">Einladung zu {row.org}</h1>
      <p className="mt-1 text-sm text-ink-500">für {row.inv.email}</p>
      <ActionForm action={acceptInviteAction} className="mt-6">
        <input type="hidden" name="token" value={token} />
        {existing ? (
          s ? <p className="text-sm text-ink-600">Angemeldet als {s.user.email}.</p> : <Alert tone="info">Bitte <Link href={`/login?next=/einladung/${token}`} className="underline">melden Sie sich zuerst an</Link>.</Alert>
        ) : (
          <>
            <Field label="Ihr Name" htmlFor="name"><Input id="name" name="name" required /></Field>
            <Field label="Passwort festlegen" htmlFor="password" hint="Mindestens 10 Zeichen, zwei Zeichenarten."><Input id="password" name="password" type="password" autoComplete="new-password" required /></Field>
          </>
        )}
        {(!existing || s) && <SubmitButton className="w-full" size="lg">Einladung annehmen</SubmitButton>}
      </ActionForm>
    </>
  );
}
