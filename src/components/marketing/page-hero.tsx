export function PageHero({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-ink-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_80%_0%,var(--color-brand-100),transparent_70%)]" />
      <div className="container-page animate-fade-up py-12 sm:py-16 lg:py-20">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl text-[2.25rem] font-bold leading-[1.1] tracking-tight sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">{intro}</p>}
        {children}
      </div>
    </section>
  );
}
