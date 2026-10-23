import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-700 text-white shadow-sm hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-soft",
        accent: "bg-accent-500 text-ink-900 shadow-sm hover:-translate-y-0.5 hover:bg-accent-400 hover:shadow-soft",
        secondary: "bg-white text-ink-800 ring-1 ring-ink-200 ring-inset shadow-sm hover:-translate-y-0.5 hover:bg-ink-50 hover:shadow-soft",
        ghost: "text-ink-700 hover:bg-ink-100",
        danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        "danger-ghost": "text-red-700 hover:bg-red-50",
        link: "text-brand-700 underline-offset-4 hover:underline px-0",
      },
      size: { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base", icon: "size-9" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonLink({
  className,
  variant,
  size,
  href,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
