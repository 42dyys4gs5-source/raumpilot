import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { getSession } from "@/lib/auth/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  return (
    <>
      <a href="#inhalt" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">Zum Inhalt springen</a>
      <MarketingHeader loggedIn={!!s} />
      <main id="inhalt">{children}</main>
      <MarketingFooter />
    </>
  );
}
