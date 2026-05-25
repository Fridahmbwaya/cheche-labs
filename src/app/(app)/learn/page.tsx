import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChecheLogo } from "@/components/brand/ChecheLogo";
import { SignOutButton } from "@/components/learn/SignOutButton";

type Unit = { id: string; title: string; order_index: number };
type Module = { id: string; title: string; description: string; units: Unit[] };

export default async function LearnPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: assignments }, { data: progress }] =
    await Promise.all([
      supabase
        .from("users")
        .select("full_name, role_title")
        .eq("id", user.id)
        .single(),
      supabase
        .from("module_assignments")
        .select(
          `module_id, modules ( id, title, description, units ( id, title, order_index ) )`
        )
        .eq("user_id", user.id),
      supabase
        .from("unit_progress")
        .select("unit_id, completed_at")
        .eq("user_id", user.id),
    ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const completedUnitIds = new Set(
    (progress ?? []).filter((p) => p.completed_at).map((p) => p.unit_id)
  );

  const mod = (assignments?.[0]?.modules as unknown as Module) ?? null;
  const units = mod
    ? [...mod.units].sort((a, b) => a.order_index - b.order_index)
    : [];
  const firstUnit = units[0];

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <ChecheLogo variant="wordmark" size="sm" />
          <div className="flex items-center gap-4">
            <span className="section-label">CBK · AML</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Karibu, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-mutedFg">
            {profile?.role_title} · Jua Microfinance Bank · CBK
          </p>
        </div>

        <p className="section-label mb-4">Your Training</p>

        {!mod ? (
          <div className="card p-6 text-center text-sm text-mutedFg">
            No modules assigned yet.
          </div>
        ) : (
          <div className="card p-6">
            <h2 className="text-lg font-bold">{mod.title}</h2>
            <p className="mt-1 text-sm text-mutedFg">{mod.description}</p>

            <ul className="mt-5 space-y-3">
              {units.map((unit) => {
                const done = completedUnitIds.has(unit.id);
                return (
                  <li key={unit.id} className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        done ? "bg-success" : "border border-border bg-muted"
                      }`}
                      aria-label={done ? "Completed" : "Not started"}
                    />
                    <span className="text-sm text-ink">{unit.title}</span>
                  </li>
                );
              })}
            </ul>

            {firstUnit && (
              <div className="mt-6">
                <a
                  href={`/learn/${mod.id}/${firstUnit.id}`}
                  className="btn-accent"
                >
                  Start learning →
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
