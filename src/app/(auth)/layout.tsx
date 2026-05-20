export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4">
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lightPurple/70 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-midPurple/20 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
