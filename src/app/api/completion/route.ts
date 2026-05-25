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

  const { moduleId } = await request.json();

  const [{ data: mod }, { data: allUnits }, { data: progress }] =
    await Promise.all([
      supabase
        .from("modules")
        .select("pass_mark, org_id")
        .eq("id", moduleId)
        .single(),
      supabase.from("units").select("id").eq("module_id", moduleId),
      supabase
        .from("unit_progress")
        .select("unit_id, quiz_score, status")
        .eq("user_id", user.id)
        .eq("module_id", moduleId),
    ]);

  const totalUnits = allUnits?.length ?? 0;
  const completedRows = (progress ?? []).filter(
    (p) => p.status === "completed"
  );
  const allComplete = completedRows.length >= totalUnits && totalUnits > 0;

  if (!allComplete) {
    return NextResponse.json({ complete: false, passed: false, finalScore: 0 });
  }

  const avgScore =
    completedRows.reduce((sum, p) => sum + (p.quiz_score ?? 0), 0) /
    completedRows.length;
  const passMark = mod?.pass_mark ?? 70;
  const passed = avgScore >= passMark;

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await admin.from("module_completions").upsert(
    {
      user_id: user.id,
      org_id: mod?.org_id,
      module_id: moduleId,
      final_score: Math.round(avgScore),
      passed,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_id" }
  );

  await admin.from("audit_log").insert({
    user_id: user.id,
    event_type: "module_completed",
    metadata: { moduleId, finalScore: Math.round(avgScore), passed },
  });

  return NextResponse.json({
    complete: true,
    passed,
    finalScore: Math.round(avgScore),
  });
}
