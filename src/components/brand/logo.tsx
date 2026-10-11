import Link from "next/link";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="currentColor" className="text-brand-700" />
      <path d="M9 23V9h7.2c3.1 0 5 1.7 5 4.3 0 2-1.1 3.4-3 4l3.6 5.7h-3.5l-3.2-5.3H12V23H9Zm3-7.9h4c1.4 0 2.2-.7 2.2-1.8s-.8-1.8-2.2-1.8h-4v3.6Z" fill="#fff" />
      <circle cx="24" cy="23" r="2.2" fill="#e8a33d" />
    </svg>
  );
}

export function Logo({ className, href = "/", inverted }: { className?: string; href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight", inverted ? "text-white" : "text-ink-900", className)} aria-label={`${BRAND.name} Startseite`}>
      <LogoMark />
      <span>{BRAND.name}</span>
    </Link>
  );
}
