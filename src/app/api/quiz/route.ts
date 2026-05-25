import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => {
          try {
            cs.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { unitId, moduleId, answer } = await request.json();

  const { data: question } = await supabase
    .from("quiz_questions")
    .select("correct_option, explanation")
    .eq("unit_id", unitId)
    .single();

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const correct =
    answer.trim().toLowerCase() ===
    question.correct_option.trim().toLowerCase();

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await admin.from("unit_progress").upsert(
    {
      user_id: user.id,
      unit_id: unitId,
      module_id: moduleId,
      status: correct ? "completed" : "in_progress",
      quiz_score: correct ? 100 : 0,
      quiz_answer: answer,
      completed_at: correct ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,unit_id" }
  );

  await admin.from("audit_log").insert({
    user_id: user.id,
    event_type: "quiz_submitted",
    metadata: { unitId, moduleId, answer, correct },
  });

  return NextResponse.json({
    correct,
    correctOption: question.correct_option,
    explanation: question.explanation,
    score: correct ? 100 : 0,
  });
}
