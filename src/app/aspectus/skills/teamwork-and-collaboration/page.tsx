/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const db = createClient();
const COURSE_SLUG = "teamwork-and-collaboration";

const stages = [
  { label: "Baseline", title: "What would you send?", time: "4 min" },
  { label: "Spot", title: "The enquiry nobody owned", time: "3 min" },
  { label: "Learn", title: "Close the loop across the team", time: "5 min" },
  { label: "Decide", title: "Who owns the quotation follow-up?", time: "3 min" },
  { label: "Practise", title: "Choose your role, solve a real work handover", time: "7 min" },
  { label: "Apply", title: "Make two changes to everyday teamwork", time: "4 min" },
] as const;

type CourseAnswers = {
  baseline: string;
  confidenceBefore: number;
  gapChoice: string;
  actionChoice: string;
  role: "sales" | "technical" | "field" | "finance" | "marketing" | "leadership";
  handoverKnown: string;
  handoverMissing: string;
  handoverOwner: string;
  handoverWhen: string;
  handoverConfirm: string;
  agreementChoices: string[];
  workHabit: string;
  confidenceAfter: number;
  completed: boolean;
};

const initial: CourseAnswers = {
  baseline: "", confidenceBefore: 3, gapChoice: "", actionChoice: "",
  role: "sales", handoverKnown: "", handoverMissing: "", handoverOwner: "",
  handoverWhen: "", handoverConfirm: "", agreementChoices: [],
  workHabit: "", confidenceAfter: 3, completed: false,
};

const scenarios = {
  sales: {
    icon: "📋", title: "Sales → Technical",
    description: "A regional agent passes an enquiry for a solar water pump to the office. The customer is interested, but nobody has confirmed the site location, water source or what the pump must deliver. Sales needs the next information-gathering step and a technical review before providing a quotation.",
    recipient: "Sales colleague to contact the customer, then Javis or the technical team to review requirements",
    known: "Regional agent has passed on a new solar pump enquiry; the customer wants to understand options.",
    missing: "Site location, water source, intended use, and technical input before a price or timing is promised",
  },
  technical: {
    icon: "🔧", title: "Technical → Installation",
    description: "A solar water-heater installation is being discussed. Julius may need to check the site, but the water setup and roof conditions haven't been confirmed. Javis must establish what is needed before the team or customer is given a firm installation date.",
    recipient: "Javis to agree the checks with Julius before anyone confirms the installation plan",
    known: "A customer wants a solar water-heater installation; exact site requirements are still being checked.",
    missing: "Water supply and roof/site details, technical requirements and a feasible installation schedule",
  },
  field: {
    icon: "📍", title: "Regional agent → Office",
    description: "An agent in Homa Bay sends photos and a voice note from a prospective customer's site. The office has no clear customer requirement, and the enquiry hasn't been fully recorded in the sales pipeline. Who will obtain the remaining details and update the customer?",
    recipient: "Named office sales owner, with technical review when the information is complete",
    known: "A Homa Bay agent has visited a prospective customer's site and shared photos and a voice note.",
    missing: "Customer need, location and contact details, missing site information and the pipeline next action",
  },
  finance: {
    icon: "🧾", title: "Finance → Sales",
    description: "A customer sends Sales a payment screenshot and asks whether an installation can go ahead. Finance has not verified the payment. The team needs one agreed customer update rather than competing promises.",
    recipient: "Finance or Nereah to confirm payment status; Sales to communicate only the verified outcome",
    known: "A customer has shared proof of a proposed payment, but receipt is not yet verified.",
    missing: "Finance confirmation and any scheduling approval before promising an installation date",
  },
  marketing: {
    icon: "📣", title: "Marketing → Technical → Brenda",
    description: "A draft Energy Tip includes a claim about solar equipment performance and a project photo. Ian or a marketing colleague has prepared it, but the technical statement hasn't been checked by Javis or Julius and Brenda hasn't approved the post. What should happen before publication?",
    recipient: "Javis or Julius for technical verification, then Brenda for final post approval",
    known: "A draft Energy Tip and project image are ready for review; nothing has been approved for posting.",
    missing: "Confirmation of technical claims, image-use clearance and Brenda's approval before publishing",
  },
  leadership: {
    icon: "📊", title: "Team → Weekly pipeline review",
    description: "Sarah wants a clear sales-pipeline update, but several opportunities have no recent progress note or named next step. Brenda needs to distinguish verified deal status from assumptions before the review.",
    recipient: "The relevant sales or field action owner to update the pipeline; Brenda to compile an accurate view",
    known: "The weekly pipeline review is approaching; some opportunity records need verification.",
    missing: "Current customer status, last verified action, assigned next step and realistic follow-up date",
  },
} as const;

const agreementOptions = [
  { id: "owner", title: "Name an owner for every next action", detail: "A new enquiry, technical question or handover has one clearly responsible next person." },
  { id: "confirm", title: "Acknowledge before assuming", detail: "The receiving colleague confirms what they've accepted or what is still missing." },
  { id: "pipeline", title: "Keep the pipeline current", detail: "Customer opportunity status, next action, owner and follow-up are recorded in the sales pipeline." },
  { id: "verify", title: "Check technical claims and promises", detail: "Ask technical colleagues to verify specifications; obtain Brenda's approval before marketing posts." },
  { id: "early", title: "Raise blockers before the deadline", detail: "Tell the relevant colleague or manager about missing details, delays or risks in time to respond." },
  { id: "updates", title: "Close the loop with a real update", detail: "Share what changed, what remains open and when the next update will happen." },
] as const;

type Session = { userId: string; orgId: string; moduleId: string; admin: boolean };

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/90 border border-[#EDD9C5] px-3 py-1.5 text-xs font-extrabold text-[#725D45]">{children}</span>;
}
function Callout({ children, tone = "warm" }: { children: ReactNode; tone?: "warm" | "green" }) {
  const classes = tone === "green"
    ? "border-[#B8E6CB] bg-[#F2FCF6] text-[#0D633B]"
    : "border-[#F1D2A8] bg-[#FFF3E3] text-[#373435]";
  return <div className={"rounded-2xl border p-4 sm:p-5 " + classes}>{children}</div>;
}
const fieldClass = "w-full rounded-xl border border-[#D9CEC3] bg-[#FFFEFC] px-4 py-3.5 text-base text-[#373435] focus:outline-none focus:ring-2 focus:ring-[#FAA954]";
const textareaClass = fieldClass + " leading-relaxed resize-y";

export default function TeamworkCollaborationPrototype() {
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [answers, setAnswers] = useState<CourseAnswers>(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [notice, setNotice] = useState("");
  const [lastSaved, setLastSaved] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: auth, error: authError } = await db.auth.getUser();
        if (authError || !auth.user) throw new Error("Sign in to your Aspectus Learning Hub account to open this preview.");
        const { data: profile, error: profileError } = await db.from("users")
          .select("id,org_id,is_active").eq("id", auth.user.id).maybeSingle();
        if (profileError || !profile?.is_active) throw new Error("Your Aspectus account is not active.");
        const { data: mod, error: moduleError } = await db.from("modules")
          .select("id,org_id,is_active").eq("org_id", profile.org_id)
          .eq("slug", COURSE_SLUG).maybeSingle();
        if (moduleError || !mod) throw new Error("This course has not been added to your organization.");
        const { data: isAdmin, error: adminError } = await db.rpc("aspectus_can_admin", { p_org_id: profile.org_id });
        if (adminError) throw adminError;
        if (!isAdmin) {
          if (!mod.is_active) throw new Error("Teamwork & Collaboration is a draft. Only administrators can preview it until it is ready for the team.");
          const { data: assignment } = await db.from("aspectus_module_assignments")
            .select("module_id").eq("module_id", mod.id)
            .eq("learner_id", auth.user.id).maybeSingle();
          if (!assignment) throw new Error("This course has not been assigned to you.");
        }
        const { data: progress, error: progressError } = await db.from("aspectus_lesson_progress")
          .select("stage_index,lesson_state,updated_at").eq("module_id", mod.id)
          .eq("learner_id", auth.user.id).maybeSingle();
        if (progressError) throw progressError;
        if (!active) return;
        const saved = progress?.lesson_state && typeof progress.lesson_state === "object"
          ? progress.lesson_state as Partial<CourseAnswers> : {};
        setAnswers({ ...initial, ...saved, agreementChoices: Array.isArray(saved.agreementChoices) ? saved.agreementChoices : [] });
        const position = Math.max(0, Math.min(stages.length, Number(progress?.stage_index) || 0));
        setUnlocked(position);
        setStage(Math.min(stages.length - 1, position));
        setLastSaved(progress?.updated_at ? new Date(progress.updated_at).toLocaleString() : "");
        setSession({ userId: auth.user.id, orgId: profile.org_id, moduleId: mod.id, admin: !!isAdmin });
      } catch (err) {
        if (active) setAuthError(err instanceof Error ? err.message : "Could not open this course.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function change<K extends keyof CourseAnswers>(key: K, value: CourseAnswers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setFeedback("");
  }

  async function save(nextStage: number, newAnswers: CourseAnswers) {
    if (!session) return false;
    setBusy(true); setNotice("");
    const updatedAt = new Date().toISOString();
    const index = Math.max(unlocked, nextStage);
    const { error } = await db.from("aspectus_lesson_progress").upsert({
      org_id: session.orgId,
      learner_id: session.userId,
      module_id: session.moduleId,
      stage_index: index,
      stage_count: stages.length,
      lesson_state: newAnswers,
      updated_at: updatedAt,
    }, { onConflict: "learner_id,module_id" });
    setBusy(false);
    if (error) { setFeedback("Could not save your progress: " + error.message); return false; }
    setUnlocked(index);
    setLastSaved(new Date(updatedAt).toLocaleString());
    return true;
  }

  function validate() {
    if (stage === 1 && answers.gapChoice !== "unclear")
      return "Ask what information was missing, who should have followed up, and what the customer was told. Try again.";
    if (stage === 3 && answers.actionChoice !== "clarify")
      return "Check the recorded pipeline next action and agree who will follow up. Don't make an unverified customer promise.";
    if (stage === 4 && [answers.handoverKnown, answers.handoverMissing, answers.handoverOwner, answers.handoverWhen, answers.handoverConfirm].some(v => !v.trim()))
      return `You have completed ${[answers.handoverKnown, answers.handoverMissing, answers.handoverOwner, answers.handoverWhen, answers.handoverConfirm].filter(v => v.trim()).length} of 5 required handover fields. Add the missing answers; there is no minimum length.`;
    if (stage === 5 && (answers.agreementChoices.length < 2 || !answers.workHabit.trim()))
      return "To finish, select at least two team agreements and enter one practical action. No minimum word count applies.";
    return "";
  }

  async function continueForward() {
    setNotice("");
    const error = validate();
    if (error) { setFeedback(error); return; }
    const complete = stage === stages.length - 1;
    const next = { ...answers, completed: answers.completed || complete };
    const nextStage = complete ? stages.length : stage + 1;
    if (await save(nextStage, next)) {
      setAnswers(next);
      if (!complete) { setStage(stage + 1); setNotice("Saved. Keep going whenever you're ready."); }
      else setNotice("Prototype complete. Your work is saved, but this is not a graded course or certificate.");
      setFeedback("");
    }
  }

  const handoverFields = [answers.handoverKnown, answers.handoverMissing, answers.handoverOwner, answers.handoverWhen, answers.handoverConfirm];
  const handoverCompleted = handoverFields.filter(value => value.trim().length > 0).length;
  const stepRequirements = [
    "Optional baseline: write any amount, or skip. There is no minimum word or character count.",
    "Required: identify the coordination problem. If you choose another answer, you'll get a hint and can try again.",
    "No answer required: read the four handover principles, then continue.",
    "Required: select the safest next step for a quotation follow-up. You can try again if needed.",
    `Required: complete all five handover fields (${handoverCompleted}/5 filled). No minimum word or character count.`,
    `Required: choose at least two team agreements (${answers.agreementChoices.length}/2 selected) and write one practical action. No minimum word or character count.`,
  ];
  const scenario = scenarios[answers.role];
  const summary = "TEAMWORK & COLLABORATION · HANDOVER PRACTICE\n\n"
    + "Scenario: " + scenario.title + "\n"
    + "Current status: " + answers.handoverKnown.trim() + "\n"
    + "Still needed: " + answers.handoverMissing.trim() + "\n"
    + "Next owner: " + answers.handoverOwner.trim() + "\n"
    + "Expected update: " + answers.handoverWhen.trim() + "\n"
    + "Confirmation: " + answers.handoverConfirm.trim() + "\n\n"
    + "Proposed team agreements:\n"
    + answers.agreementChoices.map(id => "- " + agreementOptions.find(x => x.id === id)?.title).join("\n")
    + "\n\nMy next step: " + answers.workHabit.trim();

  if (loading) return <main className="min-h-screen grid place-items-center bg-[#FFFBF6] p-6"><p className="font-extrabold">Opening your Professional Skills preview…</p></main>;
  if (authError) return <main className="min-h-screen grid place-items-center bg-[#FFFBF6] p-6"><div className="max-w-lg rounded-[26px] border border-[#EADFD3] bg-white p-8 text-center"><h1 className="text-2xl font-black">Access to this preview</h1><p className="mt-4 text-[#6B6466]">{authError}</p><Link className="inline-block mt-5 rounded-xl bg-[#FAA954] px-5 py-3 font-extrabold" href="/aspectus">Go to Learning Hub</Link></div></main>;
  if (!session) return null;

  return <main className="min-h-screen bg-[#FFFBF6] text-[#373435]">
    <header className="border-b border-[#EADFD3] bg-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex flex-wrap justify-between items-center gap-3">
        <div>
          <p className="text-xs uppercase tracking-[.16em] font-extrabold text-[#A55F12]">Aspectus Learning Hub / Professional Skills</p>
          <p className="font-black text-lg mt-1">Teamwork &amp; Collaboration</p>
        </div>
        <Link href={session.admin ? "/aspectus/admin" : "/aspectus"} className="rounded-xl border border-[#EADFD3] px-4 py-2.5 font-extrabold text-sm hover:bg-[#FFF1DF]">← Back to Learning Hub</Link>
      </div>
    </header>
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-7 sm:py-10 space-y-6">
      <section className="rounded-[30px] overflow-hidden border border-[#EAD3B6] bg-gradient-to-br from-[#FEEBD5] via-[#FFFBF6] to-white">
        <div className="h-2 bg-[#FAA954]"/>
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap gap-2">
            <Tag>Professional Skills / Course 02</Tag><Tag>For lean teams</Tag><Tag>25–30 min</Tag>
            {session.admin && <span className="rounded-full bg-[#373435] text-white px-3 py-1.5 text-xs font-extrabold">Private admin preview</span>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mt-5 max-w-3xl">A small team works best when nothing gets lost between people.</h1>
          <p className="mt-4 text-lg text-[#675E59] max-w-2xl">A lead comes from an agent. Sales needs technical input. A quotation needs follow-up. Marketing needs approval. Practise coordinating these everyday Aspectus tasks without assuming someone else has it covered.</p>
          <p className="mt-3 text-sm text-[#746B64] max-w-2xl">Training situations are illustrative, based on Aspectus roles and established work processes; they do not describe documented incidents or individual errors.</p>
          <div className="flex flex-wrap gap-2 mt-6"><Tag>Understand</Tag><Tag>Demonstrate</Tag><Tag>Apply at work</Tag></div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[250px_minmax(0,1fr)] gap-5 items-start">
        <aside className="rounded-[25px] border border-[#EADFD3] bg-white p-5 lg:sticky lg:top-5">
          <p className="text-xs font-extrabold tracking-widest uppercase text-[#A55F12]">Your learning path</p>
          <div className="h-2 bg-[#F0EAE2] rounded-full overflow-hidden mt-4"><div className="h-full bg-[#00A859] transition-all" style={{ width: String(100 * unlocked / stages.length) + "%" }}/></div>
          <p className="text-sm text-[#6B6466] mt-2">{unlocked} of {stages.length} steps completed</p>
          <ol className="space-y-2 mt-6">
            {stages.map((item, i) => <li key={item.label}>
              <button type="button" disabled={i > unlocked || busy} onClick={() => { setStage(i); setFeedback(""); setNotice(""); }}
                className={"w-full text-left flex gap-3 items-center rounded-xl border p-3 disabled:cursor-not-allowed " +
                (i === stage ? "border-[#FAA954] bg-[#FEEBD5]" : i < unlocked ? "border-[#D3F2E2] bg-[#F2FCF6]" : "border-[#F1EEEA] bg-[#F6F3EF] opacity-60")}>
                <span className={"w-8 h-8 shrink-0 grid place-items-center rounded-full font-black text-sm " + (i < unlocked ? "bg-[#00A859] text-white" : i === stage ? "bg-[#FAA954]" : "bg-[#D8D1C8]")}>{i < unlocked ? "✓" : i + 1}</span>
                <span><strong className="text-sm block">{item.label}</strong><span className="text-xs text-[#746B64]">{item.time}</span></span>
              </button>
            </li>)}
          </ol>
          {lastSaved && <p className="text-xs text-[#746B64] mt-5">Last saved: {lastSaved}</p>}
        </aside>

        <section className="rounded-[27px] border border-[#EADFD3] bg-white p-5 sm:p-9 shadow-[0_15px_35px_rgba(55,52,53,0.05)]">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <p className="text-xs uppercase tracking-[.14em] font-black text-[#A55F12]">Step {stage + 1} of {stages.length} · {stages[stage].label}</p>
            <p className="text-xs font-bold text-[#6B6466]">{stages[stage].time}</p>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mt-3">{stages[stage].title}</h2>
          <div role="note" className="mt-4 rounded-xl border border-[#EADFD3] bg-[#F7F3ED] px-4 py-3">
            <p className="text-sm font-extrabold text-[#373435]">Before you continue</p>
            <p className="mt-1 text-sm text-[#6B6466]">{stepRequirements[stage]}</p>
          </div>

          {stage === 0 && <div className="mt-6 space-y-5">
            <p className="text-lg">It's Wednesday morning. A customer has called Aspectus asking for a solar water-heater quote. Sales would like to give them an update by Friday, but Technical doesn't yet have the site location or the customer's hot-water requirements. You're passing the enquiry from Sales to Technical.</p>
            <Callout><strong className="text-sm tracking-wide uppercase text-[#A55F12]">Baseline · Before learning</strong><p className="mt-2">Write the WhatsApp handover you'd naturally send to the technical colleague. There are no right answers or minimum length here. A short or imperfect message is useful for comparing how you learn.</p></Callout>
            <label className="block font-extrabold" htmlFor="tw-baseline">Your message <span className="font-normal text-[#746B64]">(optional, any length)</span></label>
            <textarea id="tw-baseline" rows={5} className={textareaClass} value={answers.baseline} onChange={e => change("baseline", e.target.value)} placeholder="Hi, we've had a quotation request…"/>
            <label className="block font-bold" htmlFor="tw-conf-before">How confident are you with work handovers today?</label>
            <div className="flex flex-wrap items-center gap-3">
              <input id="tw-conf-before" aria-label="Confidence before learning from 1 to 5" type="range" min="1" max="5" value={answers.confidenceBefore} onChange={e => change("confidenceBefore", Number(e.target.value))} className="flex-1 min-w-40 accent-[#00A859]"/>
              <span className="rounded-lg bg-[#FEEBD5] px-4 py-2 font-black">{answers.confidenceBefore} / 5</span>
            </div>
            <p className="text-sm text-[#746B64]">Even a one-line response is useful. You can also continue without writing a baseline. Use fictional or de-identified details only; do not include real customer names or contact information.</p>
          </div>}

          {stage === 1 && <div className="mt-6 space-y-5">
            <p className="text-lg">It's Wednesday at Aspectus. A customer has asked for a solar water-heater quotation, and Sales hopes to send an estimate by Friday. See what happens in the team WhatsApp chat.</p>
            <div className="space-y-3 rounded-2xl bg-[#F5F2ED] p-5">
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white p-4 border border-[#EADFD3]"><p className="text-xs font-extrabold text-[#8B6A4A]">Sales · 9:04 AM</p><p className="mt-1">“Morning! We've got a customer asking for a solar water-heater quote. Any chance we can send it by Friday?”</p></div>
              <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-[#DCF4E7] p-4 border border-[#BCE5CB]"><p className="text-xs font-extrabold text-[#00753E]">Technical · 11:20 AM</p><p className="mt-1">“Possibly, but I'll need the site location and roughly how much hot water they need. Who's checking that with the customer?”</p></div>
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white p-4 border border-[#EADFD3]"><p className="text-xs font-extrabold text-[#8B6A4A]">Sales · 3:15 PM</p><p className="mt-1">“Oh, I thought you were calling them for those details. I said I'd update them this afternoon.”</p></div>
            </div>
            <p className="font-extrabold text-lg">What is the main collaboration failure?</p>
            <div className="space-y-3">
              {[
                { id: "speed", text: "The main problem is that Technical hasn't drafted an estimate yet." },
                { id: "unclear", text: "Neither person confirmed who would get the missing details, when they'd be ready, or what to tell the customer." },
                { id: "formal", text: "The customer didn't give enough information, so there was nothing the team could do." },
              ].map(option => <label key={option.id} className={"block cursor-pointer rounded-xl border-2 p-4 " + (answers.gapChoice === option.id ? "border-[#FAA954] bg-[#FFF4E6]" : "border-[#EADFD3]")}>
                <input type="radio" name="tw-gap" checked={answers.gapChoice === option.id} onChange={() => change("gapChoice", option.id)} className="accent-[#FAA954] w-4 h-4 mr-3"/>{option.text}
              </label>)}
            </div>
            {answers.gapChoice === "unclear" && <Callout tone="green"><strong>That's it.</strong> Each colleague thought the other would contact the customer. A proper handover makes the next action, its owner and the follow-up clear.</Callout>}
          </div>}

          {stage === 2 && <div className="mt-6 space-y-5">
            <p className="text-lg">You don't need a complex process to work well with five or eight colleagues. You need a consistent way to pass along work.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { n: "01", title: "The outcome", detail: "What needs to happen next, and why?" },
                { n: "02", title: "The context", detail: "What do we know? What is still missing or uncertain?" },
                { n: "03", title: "The owner and timing", detail: "Who takes the next action? When is an update needed?" },
                { n: "04", title: "The check-back", detail: "Has the next person received and understood the handover?" },
              ].map(item => <div key={item.n} className="rounded-2xl border border-[#ECD7C2] bg-[#FFF9F1] p-5"><p className="text-[#A55F12] text-xs font-black">{item.n}</p><h3 className="font-black text-xl mt-2">{item.title}</h3><p className="text-[#6B6466] mt-2">{item.detail}</p></div>)}
            </div>
            <Callout tone="green"><p className="font-extrabold">The key habit: close the loop.</p><p className="mt-2">The sender gives the information. The recipient confirms what they'll do or what they still need. The sender confirms the shared understanding. A message being delivered is not the same as the work being accepted.</p></Callout>
            <div className="rounded-2xl border border-[#EADFD3] p-5 space-y-3">
              <p className="text-sm font-black tracking-wide uppercase text-[#A55F12]">How that sounds</p>
              <p><strong>Sales:</strong> “I've got a solar water-heater enquiry. I'll confirm the customer's location and hot-water needs today. Once I send those, could you tell me when an estimate is realistic?”</p>
              <p><strong>Technical:</strong> “Yes. Send those details through and I'll check what else we need before we commit to a quote date.”</p>
              <p><strong>Sales:</strong> “Thanks. I'll let the customer know we're confirming the requirements and will come back with a realistic timeline.”</p>
            </div>
            <p className="text-sm text-[#746B64]">Adapted teaching principles: clear responsibilities and working agreements (Atlassian Team Playbook); confirming understanding (AHRQ TeamSTEPPS). This four-part checklist is Cheche's practice tool.</p>
          </div>}

          {stage === 3 && <div className="mt-6 space-y-5">
            <p className="text-lg">It's now Thursday afternoon. The customer is expecting an update tomorrow, but the site location and hot-water requirements still haven't been confirmed.</p>
            <p className="font-extrabold text-lg">What should the team do first?</p>
            <div className="space-y-3">
              {[
                { id: "wait", text: "Wait until Friday. It's someone else's responsibility to notice the problem." },
                { id: "promise", text: "Promise the customer they'll have a finished quote by Friday, even though the information is missing." },
                { id: "clarify", text: "Agree who will contact the customer for the missing details, ask Technical for a realistic timeline, and give the customer an honest update." },
              ].map(option => <label key={option.id} className={"block cursor-pointer rounded-xl border-2 p-4 " + (answers.actionChoice === option.id ? "border-[#FAA954] bg-[#FFF4E6]" : "border-[#EADFD3]")}>
                <input type="radio" name="tw-decision" checked={answers.actionChoice === option.id} onChange={() => change("actionChoice", option.id)} className="accent-[#FAA954] w-4 h-4 mr-3"/>{option.text}
              </label>)}
            </div>
            {answers.actionChoice === "clarify" && <Callout tone="green"><strong>Good decision.</strong> You are protecting the customer relationship while making the next action clear. Shared responsibility doesn't mean everyone must do everything.</Callout>}
            {answers.actionChoice && answers.actionChoice !== "clarify" && <Callout><strong>Consider what happens next.</strong><p className="mt-1">Waiting or making an unverified promise can create more delays. Try the option that clarifies ownership and customer expectations.</p></Callout>}
          </div>}

          {stage === 4 && <div className="mt-6 space-y-5">
            <p className="text-lg">Now practise a handover that could happen in your own role. Choose the situation closest to your work. Each of the five fields below must have a response, but short answers are welcome.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(Object.keys(scenarios) as Array<keyof typeof scenarios>).map(role => <button type="button" key={role} onClick={() => change("role", role)}
                className={"rounded-2xl text-left border-2 p-4 " + (answers.role === role ? "border-[#FAA954] bg-[#FFF2DF]" : "border-[#EADFD3] bg-white")}>
                <span className="text-2xl">{scenarios[role].icon}</span>
                <strong className="block mt-2">{scenarios[role].title}</strong>
              </button>)}
            </div>
            <Callout><p className="text-xs font-extrabold tracking-wide uppercase text-[#A55F12]">Your practice situation</p><p className="mt-2">{scenario.description}</p></Callout>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label htmlFor="tw-known" className="font-bold block mb-2">1. What is known now?</label><textarea id="tw-known" rows={3} className={textareaClass} value={answers.handoverKnown} onChange={e => change("handoverKnown", e.target.value)} placeholder={scenario.known}/></div>
              <div className="sm:col-span-2"><label htmlFor="tw-missing" className="font-bold block mb-2">2. What information is still needed?</label><textarea id="tw-missing" rows={3} className={textareaClass} value={answers.handoverMissing} onChange={e => change("handoverMissing", e.target.value)} placeholder={scenario.missing}/></div>
              <div><label htmlFor="tw-owner" className="font-bold block mb-2">3. Who needs to act next?</label><input id="tw-owner" className={fieldClass} value={answers.handoverOwner} onChange={e => change("handoverOwner", e.target.value)} placeholder={scenario.recipient}/></div>
              <div><label htmlFor="tw-when" className="font-bold block mb-2">4. When is an update needed?</label><input id="tw-when" className={fieldClass} value={answers.handoverWhen} onChange={e => change("handoverWhen", e.target.value)} placeholder="e.g. Check status by 2 pm Friday"/></div>
              <div className="sm:col-span-2"><label htmlFor="tw-confirm" className="font-bold block mb-2">5. How will you confirm the handover was understood?</label><textarea id="tw-confirm" rows={3} className={textareaClass} value={answers.handoverConfirm} onChange={e => change("handoverConfirm", e.target.value)} placeholder="e.g. Ask the recipient to confirm what they'll do and when; follow up if there's no acknowledgement."/></div>
            </div>
            <p className="text-sm text-[#746B64]">No real customer names, telephone numbers or confidential financial or technical data, please.</p>
            <Callout tone="green"><p className="font-extrabold">Your handover preview</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{"Status: " + (answers.handoverKnown.trim() || "…") + "\nMissing / to verify: " + (answers.handoverMissing.trim() || "…") + "\nNext owner: " + (answers.handoverOwner.trim() || "…") + "\nNext update: " + (answers.handoverWhen.trim() || "…") + "\nConfirmation: " + (answers.handoverConfirm.trim() || "…")}</p></Callout>
          </div>}

          {stage === 5 && <div className="mt-6 space-y-5">
            <p className="text-lg">A good team doesn't need fifty rules. It needs a few agreements that everyone actually follows. Select at least two habits worth testing at Aspectus.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {agreementOptions.map(option => <label key={option.id} className={"cursor-pointer block rounded-2xl border-2 p-4 " + (answers.agreementChoices.includes(option.id) ? "bg-[#F2FCF6] border-[#00A859]" : "border-[#EADFD3]")}>
                <span className="flex gap-3 items-start">
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-[#00A859]" checked={answers.agreementChoices.includes(option.id)}
                    onChange={() => change("agreementChoices", answers.agreementChoices.includes(option.id) ? answers.agreementChoices.filter(v => v !== option.id) : [...answers.agreementChoices, option.id])}/>
                  <span><strong className="block">{option.title}</strong><span className="block text-sm text-[#6B6466] mt-1">{option.detail}</span></span>
                </span>
              </label>)}
            </div>
            <label htmlFor="tw-next" className="font-extrabold block">What's one change you'll try in a real handover this week? <span className="font-normal text-[#746B64]">(required, any length)</span></label>
            <textarea id="tw-next" rows={4} className={textareaClass} value={answers.workHabit} onChange={e => change("workHabit", e.target.value)} placeholder="Next time I hand work to a colleague, I will…"/>
            <label className="block font-bold" htmlFor="tw-conf-after">How confident are you in handling a clear handover now?</label>
            <div className="flex items-center flex-wrap gap-3"><input id="tw-conf-after" aria-label="Confidence after learning from 1 to 5" type="range" min="1" max="5" value={answers.confidenceAfter} onChange={e => change("confidenceAfter", Number(e.target.value))} className="flex-1 min-w-40 accent-[#00A859]"/><span className="rounded-lg bg-[#D3F2E2] px-4 py-2 font-black">{answers.confidenceAfter} / 5</span></div>
            <p className="text-sm text-[#746B64]">These are self-reported confidence scores, not a validated measure of performance. A later reviewer will need to see a real handover to assess application.</p>
            {answers.completed && <Callout tone="green"><strong>✓ Your prototype is complete.</strong><p className="mt-2">Baseline, practice and team agreement are saved to your account. Nothing was sent for manager approval.</p></Callout>}
            <button type="button" onClick={() => { void navigator.clipboard.writeText(summary).then(() => setNotice("Your handover and proposed agreements were copied.")).catch(() => setFeedback("Copy failed. Please try again.")); }}
              className="rounded-xl border border-[#EADFD3] bg-white px-5 py-3 font-extrabold hover:bg-[#FEEBD5]">Copy my handover &amp; team agreements</button>
          </div>}

          {feedback && <p role="alert" className="mt-7 rounded-xl bg-[#FFF1EF] border-l-4 border-[#9B1D20] p-4 font-semibold text-[#9B1D20]">{feedback}</p>}
          {notice && <p role="status" className="mt-7 rounded-xl bg-[#F0FCF4] border-l-4 border-[#00A859] p-4 font-semibold text-[#006D3C]">{notice}</p>}
          <div className="mt-8 pt-6 border-t border-[#EADFD3] flex justify-between items-center flex-wrap gap-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={stage === 0 || busy} onClick={() => { setStage(Math.max(0, stage - 1)); setFeedback(""); setNotice(""); }}
                className="rounded-xl border border-[#EADFD3] px-5 py-3 font-extrabold disabled:opacity-40">← Back</button>
              <button type="button" disabled={busy} onClick={() => { void save(stage, answers).then(ok => { if (ok) setNotice("Progress saved to your learning account."); }); }}
                className="rounded-xl border border-[#EADFD3] px-5 py-3 font-extrabold disabled:opacity-40">{busy ? "Saving…" : "Save progress"}</button>
            </div>
            <button type="button" disabled={busy || (stage === stages.length - 1 && answers.completed)} onClick={() => { void continueForward(); }}
              className="rounded-xl bg-[#FAA954] px-6 py-3 font-extrabold disabled:opacity-50">{busy ? "Saving…" : stage === stages.length - 1 ? answers.completed ? "Saved ✓" : "Finish preview →" : stage === 0 ? (answers.baseline.trim() ? "Save baseline & continue →" : "Skip baseline & continue →") : "Save & continue →"}</button>
          </div>
        </section>
      </div>
      <div className="text-center pb-5 space-y-2">
        <p className="text-sm text-[#6B6466]">Private learning prototype · Not graded or assigned to employees</p>
        <p className="text-xs text-[#837970]">Content adapted from <a href="https://www.atlassian.com/team-playbook/plays/roles-and-responsibilities" target="_blank" rel="noreferrer" className="underline">Atlassian's Roles &amp; Responsibilities</a>, <a href="https://www.atlassian.com/team-playbook/plays/working-agreements" target="_blank" rel="noreferrer" className="underline">Working Agreements</a>, and <a href="https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/checkback.html" target="_blank" rel="noreferrer" className="underline">AHRQ's Check-Back</a> principles.</p>
      </div>
    </div>
  </main>;
}
