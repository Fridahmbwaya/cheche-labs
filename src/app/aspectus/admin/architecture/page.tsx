/* eslint-disable react/no-unescaped-entities */
"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

const db=createClient();
type Role="learner"|"reviewer"|"superadmin"|"test";
type Step={heading:string;where:string;route:string;buttons:string[];leads:string;data:string;note?:string};
const journeys:Record<Role,Step[]>={
 learner:[
  {heading:"Get access",where:"Invitation and email sign-in",route:"/preview/aspectus-welcome.html",buttons:["How it works → help overlay","Continue with email → magic link"],leads:"Auth callback → claims pending account, then takes learner to /aspectus",data:"Verified account and assigned learning",note:"Invitation email delivery must be checked separately"},
  {heading:"Personal learning home",where:"/aspectus · Home",route:"/aspectus",buttons:["Open current module → Learning screen and lesson","View learning roadmap → Learning screen","View feedback → Activity","My profile → Profile page","My learning profile → Evidence profile"],leads:"Current assigned module / learning roadmap / personal activity",data:"Reads real saved lesson, quiz and assignment records"},
  {heading:"Work through a lesson",where:"/aspectus · Lesson modal",route:"/aspectus",buttons:["Module 1 baseline → introductory questions","Next lesson step → lesson state","Submit quiz → verified score","Open assignment → learning form","Save & exit → closes modal"],leads:"Pass quiz to unlock practical project; revisit passed modules at any time",data:"Browser lesson state and Supabase lesson progress; server quiz attempt",note:"Save & exit should eventually confirm server persistence"},
  {heading:"Submit and follow up",where:"/aspectus · Learning and Activity",route:"/aspectus",buttons:["Save draft / Restore draft → browser-only response","Submit to Brenda → attachment upload + submission","Track submission → Activity","Revise and resubmit → new submission after request"],leads:"Reviewer queue → review decision → feedback and next module",data:"Private attachments, official submission row and review history"},
  {heading:"Own identity and learning record",where:"/aspectus/profile and /aspectus/learning-profile",route:"/aspectus/profile",buttons:["Choose photo → upload preview","Save profile photo → own private storage","Remove photo → initials fallback","View my learning profile → evidence page"],leads:"Personal photo and evidence view; return to Hub",data:"Avatar path, own quiz/lesson/assignment evidence; no AI inference yet"}
 ],
 reviewer:[
  {heading:"Get access",where:"Invite / verified sign-in",route:"/preview/aspectus-welcome.html",buttons:["Continue with email → callback"],leads:"/aspectus · Reviewer home",data:"Review permissions assigned explicitly by Super Admin"},
  {heading:"Reviewer's home",where:"/aspectus · Home",route:"/aspectus",buttons:["Review assignments → Activity","View journey → selected learner roadmap","Learning roadmap → observed learner","My profile → Profile page"],leads:"Activity queue or learner overview",data:"Only authorized learner data; absence of access must not appear as lost progress"},
  {heading:"Read work and save draft",where:"/aspectus · Reviews",route:"/aspectus",buttons:["Select pending assignment → open submitted work","Write feedback → autosave","Save draft now → private Hub draft"],leads:"Leave and return without submitting feedback to learner",data:"Private aspectus_review_drafts; learner cannot see draft"},
  {heading:"Make a final decision",where:"/aspectus · Review form",route:"/aspectus",buttons:["Approve as is → approved","Approve with changes → approved with feedback","Request redo → revision requested"],leads:"Learner sees feedback; if redo they can resubmit",data:"learning_reviews and status changed by RPC"},
  {heading:"Follow team and own learning",where:"/aspectus · Learning + personal profile",route:"/aspectus",buttons:["Your own learning journey → self study mode","Log issue → team issues log","Resolve / reopen issue → issues history","My learning profile → own evidence"],leads:"Own modules if assigned; separate from work being reviewed",data:"No impersonation; no writes to learner's quiz progress"}
 ],
 superadmin:[
  {heading:"Administration home",where:"/aspectus · Home",route:"/aspectus",buttons:["Team learning access → Admin overview","My learning → Admin mine","Review submissions → Activity","Manage people → Admin people","Learning Hub health → Health","Platform architecture → This map"],leads:"Team oversight, own courses, permissions or diagnostics",data:"Role-scoped organization records"},
  {heading:"Manage access",where:"/aspectus/admin",route:"/aspectus/admin?view=people",buttons:["Select person → edit panel","Save learning modules only → module assignments","Save reviewer access → reviewer coverage","Copy invitation link / Resend invite → pending accounts"],leads:"Separately update learning and reviewer rights",data:"Separate RPCs; never deletes learner history"},
  {heading:"Invite a person",where:"/aspectus/admin?view=invite",route:"/aspectus/admin?view=invite",buttons:["+ Add a person → invite","Choose role → learner / reviewer / admin","Select modules → learning access","Select reviewees → reviewer access","Send invitation → email"],leads:"Pending → verified callback → active account",data:"Pending user, module and reviewer assignments"},
  {heading:"View and diagnose",where:"/aspectus/admin/health",route:"/aspectus/admin/health",buttons:["Refresh checks → reread records","Inspect reviewer assignments → Admin people","Open Hub review workspace → /aspectus"],leads:"Troubleshooting without resetting learner progress",data:"Read-only live counts and reported error codes"},
  {heading:"Preview without affecting others",where:"/aspectus/preview",route:"/aspectus/preview",buttons:["Select any of eight onboarding modules → practice","Restart this preview → clear only local practice","Choose another module → preview library"],leads:"Admin practice only, independent of actual Ian data",data:"Per-admin browser localStorage; no official progress"},
  {heading:"Draft Professional Skills / leadership",where:"/aspectus/admin?view=mine",route:"/aspectus/admin?view=mine",buttons:["Preview Professional Skills → draft routes","From Strategy to Execution → 12-unit pilot","Export working notes → Markdown"],leads:"Unpublished course previews and an isolated facilitator pilot",data:"No official course completion; leadership notes browser only"},
  {heading:"Personal account",where:"/aspectus/profile",route:"/aspectus/profile",buttons:["Upload photo → private profile media","View my learning profile → own learning evidence"],leads:"Back to Hub",data:"Own photo and own evidence, not someone else's"}
 ],
 test:[
  {heading:"Dedicated test sign-in",where:"Welcome + verified callback",route:"/preview/aspectus-welcome.html",buttons:["Continue with email → test account sign-in"],leads:"/aspectus · test learner experience",data:"Separate records, not the real Ian account"},
  {heading:"Run onboarding tests",where:"/aspectus · Learning",route:"/aspectus",buttons:["Open modules / submit quiz / submit project → test records","Reset Module N → scoped test reset","Reset all test modules → all test history"],leads:"Fresh test state without deleting real learner records",data:"Destructive reset permitted only for designated test identity",note:"Always confirm the account before using reset controls"},
  {heading:"Check handoff",where:"Test learner Activity and reviewer access",route:"/aspectus",buttons:["View feedback → own activity","Review as assigned test reviewer → reviewer account"],leads:"Verify change requests and re-submissions without acting on Ian's work",data:"Separate test attempts and submissions"}
 ]
};
const names:Record<Role,string>={learner:"Learner · Ian",reviewer:"Reviewer · Brenda",superadmin:"Super Admin · Sarah / Fridah",test:"Test learner"};
const summary=[
 ["Learner","Self lessons, quizzes, assignments and profile","Own records"],
 ["Reviewer","Assigned learners' progress and submitted work; own learning","Only linked learners"],
 ["Super Admin","People, assignments, review access, previews, health and pilots","Org-wide administrative"],
 ["Test learner","Learner journey plus scoped reset","Test identity only"]
];
const flowLine="border-l-[3px] border-[#FAA954] pl-5 sm:pl-7 ml-3";
export default function Architecture(){
 const [allowed,setAllowed]=useState<"checking"|"yes"|"no">("checking");
 const [role,setRole]=useState<Role>("learner");
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const {data:auth}=await db.auth.getUser();
    if(!auth.user)throw Error("Sign in to use this Super Admin map.");
    const {data:p,error:e}=await db.from("users").select("org_id,role,is_active").eq("id",auth.user.id).maybeSingle();
    if(e||!p?.is_active||p.role!=="org_admin")throw Error("This workflow map is only available to active Super Admins.");
    const {data:authorized,error:err}=await db.rpc("aspectus_can_admin",{p_org_id:p.org_id});
    if(err||!authorized)throw Error("Super Admin access could not be confirmed.");
    if(active)setAllowed("yes");
   }catch(e){if(active){setAllowed("no");setError(e instanceof Error?e.message:String(e))}}
  })();
  return()=>{active=false};
 },[]);
 if(allowed!=="yes")return <main className="min-h-screen bg-[#FFFBF6] grid place-items-center px-4"><div className="max-w-lg rounded-2xl bg-white border border-[#EADFD3] p-8"><h1 className="text-2xl font-black">Platform flow map</h1><p className="mt-3">{allowed==="checking"?"Checking access…":error}</p><Link className="inline-block mt-5 text-[#A15F16] font-bold underline" href="/aspectus">Back to Hub</Link></div></main>;
 return <main className="min-h-screen bg-[#FFFBF6] text-[#373435] px-4 sm:px-6 py-8">
  <div className="max-w-6xl mx-auto space-y-6">
   <header className="rounded-[28px] bg-white border border-[#EADFD3] overflow-hidden"><div className="h-2 bg-[#FAA954]"/><div className="p-6 sm:p-9 flex flex-wrap justify-between gap-4 items-center">
    <div><p className="text-xs uppercase tracking-[.16em] font-black text-[#A15F16]">Aspectus · Pilot architecture v0.1</p><h1 className="text-3xl sm:text-4xl font-black mt-2">What leads where?</h1><p className="mt-3 text-base text-[#6B6466] max-w-2xl">A source-audited walkthrough of roles, screens, buttons, permissions and saved data. It distinguishes what exists in code from what still needs a live signed-in test.</p></div>
    <div className="flex gap-2"><Link href="/aspectus" className="rounded-xl border border-[#EADFD3] px-4 py-3 font-bold">← Back to Hub</Link><Link href="/aspectus/admin/health" className="rounded-xl bg-[#FAA954] px-4 py-3 font-extrabold">Health ↗</Link></div>
   </div></header>
   <div className="rounded-xl bg-[#FFF2DF] border-l-4 border-[#9B1D20] p-5"><strong>Audit status:</strong> Routes, navigation handlers and permissions are inspected. This is <strong>not</strong> a completed cross-account browser test. Following a link opens a real route; entries described as a “screen” are stateful views inside /aspectus, not independent URLs.</div>
   <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{summary.map(s=><div key={s[0]} className="rounded-2xl bg-white border border-[#EADFD3] p-5"><h2 className="font-black text-lg">{s[0]}</h2><p className="text-sm mt-2 text-[#6B6466]">{s[1]}</p><p className="text-sm font-bold text-[#A15F16] mt-4">{s[2]}</p></div>)}</section>
   <section className="rounded-[26px] bg-white border border-[#EADFD3] p-5 sm:p-7">
    <h2 className="text-2xl font-black">Walk the journey by role</h2><p className="mt-2 text-[#6B6466]">Select a role to see every step, the actual button labels and the handoffs.</p>
    <div role="group" aria-label="Choose role to inspect" className="flex flex-wrap gap-2 mt-5">{(Object.keys(names) as Role[]).map(k=><button key={k} type="button" onClick={()=>setRole(k)} aria-pressed={role===k} className={"rounded-xl px-4 py-3 font-extrabold text-sm border "+(role===k?"bg-[#373435] text-white border-[#373435]":"bg-white border-[#EADFD3] hover:border-[#FAA954]")}>{names[k]}</button>)}</div>
    <div className="mt-7 space-y-4">{journeys[role].map((step,i)=><article key={step.heading} className={flowLine}>
     <div className="flex items-center flex-wrap gap-3"><span className="inline-flex w-10 h-10 rounded-xl bg-[#FEEBD5] text-[#8B572B] items-center justify-center font-black">{String(i+1).padStart(2,"0")}</span><h3 className="text-xl font-black">{step.heading}</h3></div>
     <div className="rounded-2xl border border-[#EADFD3] bg-[#FFFCF8] p-4 sm:p-5 mt-3 space-y-3">
      <p className="text-sm font-bold text-[#A15F16]">Screen: {step.where}</p>
      <div><strong className="text-sm">Buttons and destinations</strong><ul className="list-disc list-inside space-y-2 mt-2 text-base">{step.buttons.map(b=><li key={b}>{b}</li>)}</ul></div>
      <div className="border-t border-[#EADFD3] pt-3"><p><strong>Leads to:</strong> {step.leads}</p><p className="text-[#6B6466] mt-2"><strong>Saved/visible data:</strong> {step.data}</p></div>
      {step.note&&<p className="rounded-lg bg-[#FFF0E9] p-3 text-sm text-[#9B1D20]"><strong>Watch-out:</strong> {step.note}</p>}
      <Link href={step.route} className="inline-block text-[#A15F16] underline font-extrabold text-sm">Open actual route ↗</Link>
     </div></article>)}</div>
   </section>
   <div className="grid lg:grid-cols-2 gap-4">
    <section className="rounded-[25px] bg-white border border-[#EADFD3] p-6"><h2 className="text-xl font-black">The critical handoff</h2><p className="mt-3 text-[#6B6466]">Learner starts → lessons save → verified quiz → practical submission → reviewer draft → formal decision → learner feedback → next work. Learning assignment and reviewer access are deliberately separate permissions.</p><p className="mt-3 font-semibold">A missing reviewer link must never be represented as 0% learner progress.</p></section>
    <section className="rounded-[25px] bg-white border border-[#EADFD3] p-6"><h2 className="text-xl font-black">Adaptive learning: now vs next</h2><p className="mt-3 text-[#6B6466]"><strong>Now:</strong> A self learning profile records real saved evidence and offers simple, transparent next steps. <strong>Not yet:</strong> Skill tagging per answer, AI feedback, confidence levels or personalized lesson branching.</p><p className="mt-3 font-semibold">Next build should be an explicit, consent-aware per-answer evidence model—not a mysterious AI score.</p></section>
   </div>
   <section className="rounded-[25px] bg-[#373435] text-white p-6 sm:p-8"><h2 className="text-2xl font-black text-white">Source-of-truth architecture document</h2><p className="mt-3 text-white/80">Includes the full route list, button inventory, role flow diagrams, data ownership, known limitations, and 10 acceptance tests. This on-screen map is an overview.</p>
    <a className="inline-block rounded-xl bg-[#FAA954] text-[#373435] px-5 py-3 mt-4 font-extrabold" href="https://github.com/Fridahmbwaya/cheche-labs/blob/feature/aspectus-learning-hub/docs/aspectus-learning-hub-architecture-pilot-v01.md" target="_blank" rel="noopener noreferrer">Read the complete workflow specification ↗</a>
   </section>
  </div>
 </main>;
}
