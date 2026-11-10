import { createClient } from "npm:@supabase/supabase-js@2.106.0";

// This function is deployed to the dedicated Aspectus development project.
// It uses that project's own server-side secret; no privileged key reaches the browser.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const hubOrigin = "https://cheche-labs-git-feature-aspectus-8d1090-fridah-mbwayas-projects.vercel.app";
function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond(405, { error: "Method not allowed" });
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const jwt = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!jwt) return respond(401, { error: "Sign in before sending invitations." });
    const url = Deno.env.get("SUPABASE_URL");
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default;
    if (!url || !secret) return respond(503, { error: "Invitation service is not configured." });

    const admin = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: identity, error: identityError } = await admin.auth.getUser(jwt);
    if (identityError || !identity.user) return respond(401, { error: "Please sign in again." });
    const { data: actor, error: profileError } = await admin.from("users")
      .select("id,org_id,role,is_active")
      .eq("id", identity.user.id).maybeSingle();
    if (profileError || !actor?.is_active) return respond(403, { error: "Account administrator access required." });
    let allowed = actor.role === "org_admin";
    if (!allowed) {
      const { data: grant } = await admin.from("aspectus_learning_admins")
        .select("user_id").eq("org_id", actor.org_id).eq("user_id", actor.id).maybeSingle();
      allowed = !!grant;
    }
    if (!allowed) return respond(403, { error: "Account administrator access required." });

    const payload = await request.json().catch(() => null);
    const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return respond(400, { error: "Enter a valid invitation email address." });
    }
    // Invite only accounts already prepared by the protected account-admin RPC.
    const { data: prepared, error: pendingError } = await admin.from("aspectus_pending_accounts")
      .select("email,org_id,full_name").eq("org_id", actor.org_id).eq("email", email).maybeSingle();
    if (pendingError || !prepared) return respond(404, { error: "Prepare this person's account first." });
    const { data: existing } = await admin.from("users")
      .select("id").eq("org_id", actor.org_id).ilike("email", email).maybeSingle();
    if (existing) return respond(409, { error: "This person has already activated an account." });

    // Supabase Auth sends its Invite user email and creates an unconfirmed auth identity.
    // When the recipient opens the link, aspectus_claim_pending_account grants the
    // role and module assignments prepared earlier, without changing existing learners.
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: hubOrigin + "/aspectus/auth/callback",
    });
    if (inviteError) {
      console.error("Aspectus invitation email request failed", { code: inviteError.code, status: inviteError.status });
      return respond(502, { error: inviteError.message || "The email provider rejected this invitation." });
    }
    return respond(200, { accepted: true, email });
  } catch (error) {
    console.error("Aspectus invitation service failed", error instanceof Error ? error.message : "unknown error");
    return respond(500, { error: "Unable to send this invitation. The saved account is unchanged." });
  }
});
