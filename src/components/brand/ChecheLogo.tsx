import { cn } from "@/lib/utils";

type ChecheLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** variant kept for backwards compatibility — always renders text logo */
  variant?: "wordmark" | "image";
};

const sizeClasses = {
  sm: "text-sm px-3 py-1",
  md: "text-base px-3.5 py-1.5",
  lg: "text-lg px-4 py-2",
};

export function ChecheLogo({ className, size = "md" }: ChecheLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-primary font-display font-bold tracking-display text-white",
        sizeClasses[size],
        className
      )}
    >
      cheche<span style={{ color: "#F75B0D" }}>.</span>
    </span>
  );
}
