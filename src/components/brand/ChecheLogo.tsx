import Image from "next/image";
import { cn } from "@/lib/utils";

type ChecheLogoProps = {
  className?: string;
  /** Use image asset when available; falls back to wordmark */
  variant?: "wordmark" | "image";
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

const imageHeights = {
  sm: 28,
  md: 40,
  lg: 48,
};

export function ChecheLogo({
  className,
  variant = "wordmark",
  size = "md",
}: ChecheLogoProps) {
  if (variant === "image") {
    const height = imageHeights[size];
    return (
      <Image
        src="/cheche-logo.png"
        alt="Cheche Labs"
        width={140}
        height={70}
        className={cn("w-auto object-contain", className)}
        style={{ height }}
        priority
      />
    );
  }

  return (
    <span
      className={cn(
        "font-display font-bold tracking-display text-primary",
        sizeClasses[size],
        className
      )}
    >
      cheche<span className="text-accent">.</span>
    </span>
  );
}
