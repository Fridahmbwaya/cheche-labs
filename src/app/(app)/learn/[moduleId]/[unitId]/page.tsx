import { redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/server";
import { ChecheLogo } from "@/components/brand/ChecheLogo";
import { Quiz } from "@/components/learn/Quiz";

type PageProps = {
  params: { moduleId: string; unitId: string };
};

export default async function LessonPage({ params }: PageProps) {
  const { moduleId, unitId } = params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: unit },
    { data: allUnits },
    { data: questions },
    { data: progress },
  ] = await Promise.all([
    supabase
      .from("units")
      .select(
        "id, title, subtitle, body, unit_type, position, role_action, role_action_desc, reg_anchor, reg_anchor_desc, ai_tip"
      )
      .eq("id", unitId)
      .single(),
    supabase
      .from("units")
      .select("id, title, position")
      .eq("module_id", moduleId)
      .order("position", { ascending: true }),
    supabase
      .from("quiz_questions")
      .select("id, question, options, correct_option, explanation")
      .eq("unit_id", unitId),
    supabase
      .from("unit_progress")
      .select("unit_id, status, completed_at")
      .eq("user_id", user.id)
      .eq("module_id", moduleId),
  ]);

  if (!unit) redirect("/learn");

  const completedUnitIds = new Set(
    (progress ?? [])
      .filter((p) => p.status === "completed" || p.completed_at)
      .map((p) => p.unit_id)
  );

  const sortedUnits = allUnits ?? [];
  const currentIndex = sortedUnits.findIndex((u) => u.id === unitId);
  const nextUnit = sortedUnits[currentIndex + 1] ?? null;
  const totalUnits = sortedUnits.length;

  const quizQuestion = questions?.[0] ?? null;
  const quizOptions: string[] = Array.isArray(quizQuestion?.options)
    ? quizQuestion.options
    : [];

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <ChecheLogo variant="wordmark" size="sm" />
          <a href="/learn" className="text-sm text-mutedFg hover:text-ink">
            ← Dashboard
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left column */}
          <div className="flex flex-col gap-6 lg:w-2/3">
            {/* Unit header */}
            <div className="rounded-card bg-darkPurple p-6 text-white">
              <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-sidebarFg">
                Unit {unit.position} of {totalUnits}
              </p>
              <h1 className="text-2xl font-bold text-white">{unit.title}</h1>
              {unit.subtitle && (
                <p className="mt-1 text-sm text-sidebarFg">{unit.subtitle}</p>
              )}
            </div>

            {/* Lesson body */}
            {unit.body && (
              <div className="card p-6">
                <div className="prose prose-sm max-w-none text-ink prose-headings:font-display prose-headings:text-ink prose-a:text-primary prose-strong:text-ink">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {unit.body}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Role action */}
            {unit.role_action && (
              <div className="card border-l-4 border-l-accent p-6">
                <p className="section-label mb-2">Role Action</p>
                <h3 className="font-bold text-ink">{unit.role_action}</h3>
                {unit.role_action_desc && (
                  <p className="mt-2 text-sm text-mutedFg">
                    {unit.role_action_desc}
                  </p>
                )}
              </div>
            )}

            {/* Quiz */}
            {quizQuestion && quizOptions.length > 0 && (
              <Quiz
                question={quizQuestion.question}
                options={quizOptions}
                unitId={unitId}
                moduleId={moduleId}
                nextUnitId={nextUnit?.id ?? null}
              />
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4 lg:w-1/3">
            {/* Progress card */}
            <div className="card p-5">
              <p className="section-label mb-3">Progress</p>
              <ul className="space-y-2.5">
                {sortedUnits.map((u) => {
                  const isCurrent = u.id === unitId;
                  const isDone = completedUnitIds.has(u.id);
                  return (
                    <li key={u.id} className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          isDone
                            ? "bg-success"
                            : isCurrent
                            ? "bg-accent"
                            : "border border-border bg-muted"
                        }`}
                        aria-label={
                          isDone
                            ? "Completed"
                            : isCurrent
                            ? "Current"
                            : "Not started"
                        }
                      />
                      <span
                        className={`text-sm ${
                          isCurrent ? "font-medium text-ink" : "text-mutedFg"
                        }`}
                      >
                        {u.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Regulatory anchor */}
            {unit.reg_anchor && (
              <div className="card p-5">
                <p className="section-label mb-2">Regulatory Basis</p>
                <p className="text-sm font-bold text-ink">{unit.reg_anchor}</p>
                {unit.reg_anchor_desc && (
                  <p className="mt-1 text-xs text-mutedFg">
                    {unit.reg_anchor_desc}
                  </p>
                )}
              </div>
            )}

            {/* AI tip */}
            {unit.ai_tip && (
              <div className="rounded-card bg-lavender p-5">
                <p className="section-label mb-2">AI Study Tip</p>
                <p className="text-sm text-ink">{unit.ai_tip}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
