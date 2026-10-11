export function PageHero({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-ink-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_80%_0%,var(--color-brand-100),transparent_70%)]" />
      <div className="container-page py-16 lg:py-20">
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{eyebrow}</p>}
        <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg text-ink-600">{intro}</p>}
        {children}
      </div>
    </section>
  );
}
