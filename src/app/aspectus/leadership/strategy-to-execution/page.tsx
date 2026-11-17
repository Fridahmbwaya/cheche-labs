/* eslint-disable react/no-unescaped-entities */
"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

const db=createClient();
const KEY="cheche-leadership-strategy-pilot-v01";
type Prompt={label:string;hint:string};
type Unit={title:string;phase:string;learn:string;idea:string;caseStudy:string;tryIt:string;prompts:Prompt[];output:string;facilitator:string;watchout:string};
const units:Unit[]=[
 {title:"Define the leadership mandate",phase:"Frame the challenge",learn:"Distinguish desired business outcomes from activity, and set the scope of the decision.",
  idea:"A mandate is not a project list. It specifies the business outcome, who can decide, the time horizon, and how leadership will know whether the work mattered.",
  caseStudy:"Illustrative Aspectus question: What would responsible growth in solar heating and pumping mean over the next quarter?",
  tryIt:"Write a one-sentence mandate for a real growth or operating challenge. Clarify the decisions the group can make and what needs approval.",
  prompts:[
   {label:"The mandate: who needs to achieve what, by when, and why?",hint:"Example structure: Our leadership team will [outcome] for [customer or operation] within [time] because [business need]."},
   {label:"Decision boundaries and success test",hint:"Who owns this mandate? Which decisions are in or out of scope? What evidence would show progress?"}
  ],output:"Mandate statement and success test",facilitator:"Are we defining an outcome, or just restating a project already under way?",watchout:"Do not invent a sales target or approval authority. Mark unknowns for validation."},
 {title:"Diagnose the current reality",phase:"Frame the challenge",learn:"Separate current evidence from assumptions and outdated records.",
  idea:"A confident strategy built on stale information is fragile. Label each statement as verified, estimated, anecdotal, or unknown and record its source date.",
  caseStudy:"Illustrative Aspectus test: Reconcile recent inquiries, quotations, installations, costs and delivery timelines before declaring which bottleneck matters most.",
  tryIt:"Select three relevant signals. Identify their sources, reliability and what remains unclear.",
  prompts:[
   {label:"Three current signals, with sources and dates",hint:"Consider conversion, quotation turnaround, installation capacity, costs, receivables or customer complaints."},
   {label:"Important assumptions and evidence gaps",hint:"Which claims have not been checked? Who can verify them, and what is the next best source?"}
  ],output:"Current-state diagnostic and evidence gaps",facilitator:"Where are we assuming momentum that the data cannot yet support?",watchout:"Historical numbers are not automatically current facts."},
 {title:"Choose the customer and problem",phase:"Make strategic choices",learn:"Select a priority customer segment and a consequential unmet need.",
  idea:"A segment is useful only when its need, accessibility, buying journey and delivery constraints are specific enough to inform a real choice.",
  caseStudy:"Hypothetical comparison: households exploring solar water heating versus agricultural customers exploring solar pumping.",
  tryIt:"Compare two plausible segments for customer value, ability to reach them and operational feasibility.",
  prompts:[
   {label:"Priority segment and the problem we would solve",hint:"Who exactly is the buyer? What job are they trying to get done? What evidence supports this need?"},
   {label:"Alternative segment and why it is lower priority for this pilot",hint:"Do not assume this segment is bad; identify the trade-off and what might change the decision."}
  ],output:"Customer-problem brief",facilitator:"Are we selecting customers because they need us, or because they are the customers we already know?",watchout:"Do not commit to a customer claim without speaking to actual buyers."},
 {title:"Clarify the value proposition",phase:"Make strategic choices",learn:"State a credible customer benefit and the proof behind it.",
  idea:"A value proposition names the customer problem, the practical benefit, the alternative and the evidence required to support the claim.",
  caseStudy:"Hypothetical: A customer values reliable installation and understandable after-sales support more than a generic 'affordable solar' slogan.",
  tryIt:"Draft a market promise and pressure-test it against an alternative supplier or status quo.",
  prompts:[
   {label:"One-sentence value proposition",hint:"For [segment] with [problem], we help [outcome] through [distinctive capability], unlike [alternative]."},
   {label:"Evidence and claims we must verify before communicating",hint:"Which service, timeline, savings, quality or warranty statements require approved proof?"}
  ],output:"Value proposition and proof checklist",facilitator:"What could a skeptical customer reasonably challenge in that sentence?",watchout:"No unverified performance, cost-saving or technical promises."},
 {title:"Make strategic trade-offs",phase:"Make strategic choices",learn:"Decide what to prioritize—and what not to pursue this quarter.",
  idea:"Strategy is partly the discipline of saying no. A short set of choices creates space for execution and makes resource trade-offs visible.",
  caseStudy:"Hypothetical: The same small team cannot simultaneously overhaul lead management, open multiple new regions and launch an ambitious new product line.",
  tryIt:"Make three explicit choices and identify activities to pause or decline.",
  prompts:[
   {label:"Three choices we will prioritize, with reasons",hint:"Identify customer/market focus, distinctive capability and execution priority. Note the evidence or assumption behind each."},
   {label:"Stop-doing or defer list",hint:"Which attractive initiatives will we not pursue in the next 90 days? What would justify reconsidering them?"}
  ],output:"Three strategic choices and stop-doing list",facilitator:"If everything is a priority, which initiative will suffer first—and who is willing to own that trade-off?",watchout:"Avoid a list of twelve 'top' priorities."},
 {title:"Build the strategy logic",phase:"Make strategic choices",learn:"Connect activities to customer outcomes and financial results through testable assumptions.",
  idea:"A strategy map is a causal hypothesis, not proof. It shows what must be true for an activity to create the result leadership expects.",
  caseStudy:"Illustrative chain: Faster qualified inquiry responses → better quotation follow-up → more converted customers → revenue, if installation capacity holds.",
  tryIt:"Write an if–then chain and identify the link that is most uncertain.",
  prompts:[
   {label:"Our cause-and-effect logic",hint:"If we improve [capability], then [customer/operating behavior] should change, leading to [result], provided [constraint]."},
   {label:"The weakest assumption and how to test it",hint:"What small experiment or existing evidence could disprove or strengthen this logic?"}
  ],output:"Simple strategy map and key assumptions",facilitator:"What else must happen for this improvement to lead to revenue or quality?",watchout:"Correlation and plausible logic are not guarantees."},
 {title:"Translate priorities into outcomes",phase:"Translate into action",learn:"Define leading and lagging measures with baselines and owners.",
  idea:"Lagging measures report a result; leading measures indicate whether the process is moving toward it. Both require clear definitions and realistic baselines.",
  caseStudy:"Hypothetical: Revenue conversion is a lagging measure; timely response to qualified inquiries might be a useful leading measure.",
  tryIt:"Design two outcomes and two leading measures tied to one strategic priority.",
  prompts:[
   {label:"Two outcomes and how we will measure them",hint:"For each: definition, baseline (or unknown), proposed target, data source, responsible owner and review date."},
   {label:"Two leading indicators and what action they should trigger",hint:"For each: event definition, reporting rhythm and what threshold requires discussion."}
  ],output:"KPI dictionary with baselines, targets and owners",facilitator:"Could two colleagues calculate the same KPI and get the same answer?",watchout:"Do not present proposed targets as approved commitments."},
 {title:"Select the initiative portfolio",phase:"Translate into action",learn:"Rank initiatives on impact, effort, risk, dependencies and strategic fit.",
  idea:"Good initiatives have an explicit connection to the chosen strategy and compete for the same constrained people and budget.",
  caseStudy:"Hypothetical options: inquiry handling, sales enablement, technician handovers, customer communications and workflow automation.",
  tryIt:"Rank candidate initiatives and justify why only a small number can start this quarter.",
  prompts:[
   {label:"Ranked top initiatives and expected benefit",hint:"For each: strategic outcome, likely impact, effort, dependencies and main risk."},
   {label:"Deferred initiatives and why",hint:"What has lower fit, higher risk or insufficient capacity? What evidence would change the ranking?"}
  ],output:"Prioritized initiative register",facilitator:"Which initiative loses its place when we account for actual people-hours?",watchout:"Avoid using impact scores as a substitute for explicit assumptions."},
 {title:"Allocate money and capacity",phase:"Translate into action",learn:"Check whether the plan fits available people, cash and critical skills.",
  idea:"A quarterly plan only becomes credible when it includes who has the capacity to do it and the costs and dependencies it creates.",
  caseStudy:"Hypothetical: The same technical lead is needed for customer quotations, installation support and training new staff.",
  tryIt:"Estimate a practical resource envelope and choose what to reduce if capacity is tighter than expected.",
  prompts:[
   {label:"Capacity and resource envelope",hint:"Estimate team hours, relevant roles, cash needed, timing and what information is not yet available."},
   {label:"Constraint or fallback plan",hint:"If staff time or cash falls short, which scope, sequence or initiative will change first?"}
  ],output:"Capacity assumptions and resource envelope",facilitator:"What existing commitments would need to be delayed for this plan to happen?",watchout:"Do not collect confidential salaries or customer financial details in this browser pilot."},
 {title:"Assign owners and handoffs",phase:"Translate into action",learn:"Clarify accountability, supporting roles, dates and escalation.",
  idea:"One accountable owner does not mean one person does all the work. A handoff should specify the decision, minimum information required and response deadline.",
  caseStudy:"Hypothetical customer journey: marketing receives an inquiry, sales qualifies it, technical staff scopes the solution and field staff deliver.",
  tryIt:"Trace one cross-functional initiative from handoff to handoff and resolve gaps.",
  prompts:[
   {label:"Single accountable owner and important contributors",hint:"Use role titles when possible. Who decides? Who does the work? Who must be consulted?"},
   {label:"Handoffs, deadline and escalation rules",hint:"What information changes hands, how quickly, and who gets involved when it stalls?"}
  ],output:"Owner map and escalation protocol",facilitator:"If this is late on Friday, who knows they must act on Monday morning?",watchout:"Avoid assigning responsibilities to people before confirming availability and agreement."},
 {title:"Install the execution cadence",phase:"Review and adjust",learn:"Create useful weekly, monthly and quarterly review rhythms.",
  idea:"A meeting is an operating mechanism only when it uses fresh evidence, resolves impediments, records decisions and closes action loops.",
  caseStudy:"Hypothetical 20-minute weekly review: progress against lead response, quotation follow-up, delivery risks and commitments.",
  tryIt:"Design a short agenda and define what leadership does when a measure slips.",
  prompts:[
   {label:"Weekly review: agenda, attendees and decision rules",hint:"Include data cutoff, biggest variance, blockers, decisions, owners and follow-up."},
   {label:"Monthly and quarterly review checkpoints",hint:"Which measures need deeper monthly analysis? When should the strategic choices themselves be reconsidered?"}
  ],output:"Execution cadence and recurring meeting agenda",facilitator:"How will this meeting change a real decision, not just create more reporting?",watchout:"Do not confuse activity reporting with resolving constraints."},
 {title:"Lead a 90-day execution review",phase:"Review and adjust",learn:"Translate the choices into a defendable plan with review triggers.",
  idea:"A 90-day plan should make commitments visible, while keeping assumptions and the right to adjust explicit. Leadership approval happens outside this prototype.",
  caseStudy:"Hypothetical leadership review: Present a plan for the next quarter, defend one difficult trade-off and name an early warning sign.",
  tryIt:"Present the plan as if another leader has ten minutes to challenge it. Record requested changes before any real approval.",
  prompts:[
   {label:"30 / 60 / 90-day milestones and responsible owners",hint:"For each checkpoint, include deliverable, owner, data needed and blocker to resolve."},
   {label:"Risks, stop-or-adjust triggers and first review date",hint:"What evidence should trigger changing direction? Who will convene the review?"},
   {label:"Leadership decisions still needed / sign-off status",hint:"Mark as proposed, under discussion or approved externally. This pilot cannot sign or authorize a business strategy."}
  ],output:"Proposed 90-day plan and review commitments",facilitator:"What would we stop doing tomorrow if we agreed to this plan today?",watchout:"A completed pilot is not a board-approved strategy."}
];

type Saved={notes:Record<string,string>;discussed:number[];feedback:Record<string,string>;updatedAt:string};
const blank:Saved={notes:{},discussed:[],feedback:{},updatedAt:""};
function safeParse(v:string|null):Saved{
 try{
  if(!v)return blank;
  const x=JSON.parse(v);
  if(!x||typeof x!=="object")return blank;
  return {notes:x.notes&&typeof x.notes==="object"?x.notes:{},discussed:Array.isArray(x.discussed)?x.discussed.filter((n:unknown)=>typeof n==="number"&&n>=0&&n<12):[],feedback:x.feedback&&typeof x.feedback==="object"?x.feedback:{},updatedAt:typeof x.updatedAt==="string"?x.updatedAt:""};
 }catch{return blank}
}
const phaseLabels=["Frame the challenge","Make strategic choices","Translate into action","Review and adjust"];

export default function StrategyToExecutionPilot(){
 const [authorized,setAuthorized]=useState<"checking"|"yes"|"no">("checking");
 const [authError,setAuthError]=useState("");
 const [active,setActive]=useState(0);
 const [data,setData]=useState<Saved>(blank);
 const [loaded,setLoaded]=useState(false);
 const [showFacilitator,setShowFacilitator]=useState(true);
 const [showSummary,setShowSummary]=useState(false);
 const [saveError,setSaveError]=useState(false);
 const [updated,setUpdated]=useState("");
 useEffect(()=>{
  let alive=true;
  (async()=>{
   try{
    const {data:auth,error}=await db.auth.getUser();
    if(error||!auth.user)throw Error("Sign in with an Aspectus Super Admin account to use this pilot.");
    const {data:p,error:profileError}=await db.from("users").select("id,role,is_active,org_id").eq("id",auth.user.id).maybeSingle();
    if(profileError||!p?.is_active||p.role!=="org_admin")throw Error("This first working-session pilot is limited to active Aspectus Super Admins.");
    const {data:canAdmin,error:adminError}=await db.rpc("aspectus_can_admin",{p_org_id:p.org_id});
    if(adminError||!canAdmin)throw Error("Your account does not have permission to preview this leadership pilot.");
    if(alive)setAuthorized("yes");
   }catch(e){if(alive){setAuthorized("no");setAuthError(e instanceof Error?e.message:"Unable to check preview access.");}}
  })();
  return()=>{alive=false};
 },[]);
 useEffect(()=>{
  if(authorized!=="yes")return;
  try{const draft=safeParse(window.localStorage.getItem(KEY));setData(draft);setUpdated(draft.updatedAt);}
  catch{setData(blank);}
  setLoaded(true);
 },[authorized]);
 function change(updater:(d:Saved)=>Saved){
  setData(prev=>{
   const next={...updater(prev),updatedAt:new Date().toISOString()};
   setUpdated(next.updatedAt);
   try{window.localStorage.setItem(KEY,JSON.stringify(next));setSaveError(false)}
   catch{setSaveError(true)}
   return next;
  });
 }
 const unit=units[active], key=(i:number,p:number)=>"u"+(i+1)+"p"+(p+1);
 const written=useMemo(()=>units.map((u,i)=>u.prompts.some((p,j)=>(data.notes[key(i,j)]||"").trim())).filter(Boolean).length,[data.notes]);
 const completed=data.discussed.length;
 const currentQuestions=unit.prompts;
 function exportNotes(){
  const output=[
   "# Cheche Labs · Strategy to Execution — PILOT working notes",
   "_Working session only · Not a final course, approved strategy, evaluation or certificate_",
   "",
   "Saved locally: "+(data.updatedAt||"Not saved"),
   "Status: "+completed+" of 12 units marked discussed",
   "",
   ...units.flatMap((u,i)=>[
    "## Unit "+String(i+1).padStart(2,"0")+" · "+u.title,
    "**Pilot discussion status:** "+(data.discussed.includes(i)?"Discussed":"Not marked discussed"),
    "**Expected draft output:** "+u.output,"",
    ...u.prompts.flatMap((p,j)=>["### "+p.label,(data.notes[key(i,j)]||"_(not answered)_"),""]),
    "**Participant's feedback on this unit:** "+(data.feedback["u"+(i+1)]||"_(not recorded)_"),""
   ]),
   "---","## Important note",
   "All statements and targets above are drafts for human validation. No approval was recorded by this tool."
  ].join("\n");
  const blob=new Blob([output],{type:"text/markdown;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const el=document.createElement("a");el.href=url;el.download="Cheche_Strategy_Execution_PILOT_Working_Notes.md";document.body.appendChild(el);el.click();el.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function reset(){
  if(!window.confirm("Clear all saved pilot working notes on this browser? This cannot be undone. It will not affect any official Learning Hub records."))return;
  const next={...blank,updatedAt:new Date().toISOString()};
  try{window.localStorage.setItem(KEY,JSON.stringify(next));setSaveError(false)}catch{setSaveError(true)}
  setData(next);setActive(0);setShowSummary(false);setUpdated(next.updatedAt);
 }
 if(authorized!=="yes"||!loaded)return <main className="min-h-screen bg-[#FFF9F1] text-[#373435] grid place-items-center px-5"><div className="w-full max-w-xl rounded-[28px] bg-white border border-[#EADFD3] p-8 shadow-sm"><span className="inline-flex rounded-full bg-[#FFF1E0] px-3 py-2 text-[15px] font-black uppercase tracking-[.15em] text-[#9B1D20]">Pilot · Not final</span><h1 className="text-3xl font-black mt-4">From Strategy to Execution</h1><p className="text-[#6B6466] mt-3">{authorized==="no"?authError:"Checking pilot access and restoring your draft…"}</p><Link href="/aspectus" className="inline-block mt-6 rounded-xl bg-[#FAA954] px-5 py-3 font-extrabold">Return to Learning Hub</Link></div></main>;
 return <main className="min-h-screen bg-[#FFF9F1] text-[#373435] text-lg leading-relaxed">
  <div className="sticky top-0 z-30 bg-[#373435] text-white border-b-4 border-[#FAA954]">
   <div className="max-w-7xl mx-auto px-4 sm:px-7 py-3 flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center flex-wrap gap-3"><span className="rounded-full bg-[#FAA954] text-[#373435] px-3 py-1.5 text-[15px] font-black uppercase tracking-[.14em]">Pilot v0.1 · Not final</span><span className="font-semibold text-base">Cheche Labs · Leadership &amp; Management Academy</span></div>
    <Link href="/aspectus" className="text-base font-bold text-[#FAA954] underline">Back to Aspectus Hub</Link>
   </div>
  </div>
  <div className="max-w-7xl mx-auto px-4 sm:px-7 py-7 sm:py-9 space-y-6">
   <header className="rounded-[30px] border border-[#EADFD3] bg-white overflow-hidden">
    <div className="p-6 sm:p-9 lg:p-10 bg-gradient-to-br from-[#FFF1DB] via-[#FFFAF4] to-white">
     <p className="text-[15px] uppercase tracking-[.2em] font-black text-[#A15F16]">Course 01 / Six-course leadership pilot</p>
     <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="max-w-3xl"><h1 className="text-3xl sm:text-5xl font-black tracking-tight mt-3">From Strategy to Execution</h1><p className="mt-4 text-lg text-[#60594F] leading-relaxed">Turn a strategic direction into a few defensible choices, accountable owners and a realistic 90-day plan.</p></div>
      <div className="rounded-2xl border border-[#F0D7B4] bg-white p-4 max-w-[260px]"><p className="text-[15px] font-black uppercase text-[#9B1D20] tracking-wider">Working prototype</p><p className="text-base text-[#6B6466] mt-2">Exercises, sequencing and language will be revised after live testing. Nothing here is an approved company strategy.</p></div>
     </div>
     <div className="mt-6 flex flex-wrap gap-2 text-[15px] font-bold text-[#7A5230]"><span className="rounded-full bg-white border border-[#EADFD3] px-3 py-2">12 working units</span><span className="rounded-full bg-white border border-[#EADFD3] px-3 py-2">Facilitated + applied work</span><span className="rounded-full bg-white border border-[#EADFD3] px-3 py-2">Aspectus test context</span><span className="rounded-full bg-white border border-[#EADFD3] px-3 py-2">No official LMS progress</span></div>
    </div>
    <div className="p-5 sm:px-9 sm:py-5 flex flex-wrap gap-4 items-center justify-between">
     <div><p className="text-base font-extrabold">{completed} / 12 units discussed · {written} / 12 with working notes</p><div className="mt-2 h-2 w-[min(380px,70vw)] bg-[#F1E9DF] rounded-full overflow-hidden"><div className="h-full bg-[#00A859] transition-all" style={{width:(100*completed/12)+"%"}}/></div></div>
     <div className="text-right"><p className="text-[15px] text-[#6B6466]">{saveError?"Your browser could not save this draft. Export your notes now.":updated?"Draft stored in this browser · "+new Date(updated).toLocaleString("en-KE"):"No changes yet"}</p><button type="button" className="text-base font-extrabold text-[#A15F16] underline mt-2" onClick={exportNotes}>Export working notes ↓</button></div>
    </div>
   </header>
   <div className="rounded-xl border-l-4 border-[#9B1D20] bg-white p-4 text-base text-[#5B514C]"><strong>Privacy and pilot scope:</strong> Your responses stay in this browser only, not in Supabase or the official training records. Use examples or anonymized figures; do not enter confidential financial, customer or personnel data. On shared devices, export and clear your draft after the session.</div>
   <div className="grid lg:grid-cols-[330px_minmax(0,1fr)] items-start gap-5">
    <aside className="rounded-[25px] border border-[#EADFD3] bg-white p-5 lg:sticky lg:top-20">
     <div className="flex justify-between gap-2 items-center mb-4"><h2 className="text-base uppercase tracking-[.14em] font-black text-[#A15F16]">Working units</h2><button type="button" className="text-[15px] underline font-bold" onClick={()=>setShowSummary(v=>!v)}>{showSummary?"Return to units":"Overview"}</button></div>
     <div className="space-y-4">
      {phaseLabels.map(phase=><div key={phase}><p className="text-sm uppercase tracking-widest font-extrabold text-[#847469] mb-1.5 px-2">{phase}</p><div className="space-y-1.5">
       {units.map((m,i)=>m.phase!==phase?null:<button key={i} type="button" onClick={()=>{setActive(i);setShowSummary(false)}} aria-current={!showSummary&&active===i?"step":undefined} className={"w-full rounded-xl border text-left px-3 py-3 flex items-start gap-3 transition-colors "+(!showSummary&&active===i?"border-[#E1A557] bg-[#FFF0D6]":"border-transparent hover:border-[#EADFD3] hover:bg-[#FFFAF4]")}>
        <span className={"inline-flex items-center justify-center shrink-0 rounded-lg w-8 h-8 text-[15px] font-black "+(data.discussed.includes(i)?"bg-[#D3F2E2] text-[#00753E]":"bg-[#F3EDE4] text-[#8A5B2C]")}>{data.discussed.includes(i)?"✓":String(i+1).padStart(2,"0")}</span>
        <span className="min-w-0"><strong className="block text-base leading-snug">{m.title}</strong><span className="text-[15px] text-[#7A716B]">{m.prompts.some((p,j)=>(data.notes[key(i,j)]||"").trim())?"Draft started":"Not started"}{data.discussed.includes(i)?" · Discussed":""}</span></span>
       </button>)}
      </div></div>)}
     </div>
     <div className="border-t border-[#EADFD3] mt-5 pt-4 space-y-2">
      <button type="button" className="block w-full text-left rounded-xl bg-[#373435] text-white px-4 py-3 font-extrabold text-base" onClick={()=>setShowSummary(true)}>Review the 90-day working pack →</button>
      <button type="button" className="text-[15px] font-semibold text-[#9B1D20] underline px-1" onClick={reset}>Clear local pilot draft</button>
     </div>
    </aside>
    {showSummary?
     <section className="rounded-[27px] bg-white border border-[#EADFD3] p-6 sm:p-9 space-y-5">
      <p className="text-[15px] uppercase tracking-widest font-extrabold text-[#A15F16]">Unapproved pilot output</p><h2 className="text-2xl sm:text-3xl font-black">Your strategy-to-execution working pack</h2><p className="text-[#6B6466] leading-relaxed">This combines the notes captured across the 12 units. It is a discussion artifact, not a validated or signed strategy. Export it for the facilitator to review, challenge and refine with leadership.</p>
      <div className="grid sm:grid-cols-3 gap-3">{[{label:"Mandate",i:0},{label:"Trade-offs",i:4},{label:"90-day plan",i:11}].map(v=><div key={v.label} className="rounded-xl bg-[#FFF7EB] border border-[#F0DFCA] p-4"><p className="text-[15px] font-bold uppercase text-[#A15F16]">{v.label}</p><p className="text-base whitespace-pre-wrap mt-2">{(data.notes[key(v.i,0)]||"").trim()||"Not captured yet"}</p></div>)}</div>
      <div className="space-y-3">{units.map((m,i)=><div key={i} className="rounded-xl border border-[#EADFD3] p-4"><div className="flex items-center gap-3"><span className="text-[15px] font-black text-[#A15F16]">{String(i+1).padStart(2,"0")}</span><h3 className="font-extrabold">{m.output}</h3></div><p className="text-base mt-2 text-[#6B6466]">{m.prompts.map((p,j)=>data.notes[key(i,j)]?.trim()).filter(Boolean).length} of {m.prompts.length} prompts answered</p></div>)}</div>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={exportNotes} className="rounded-xl bg-[#FAA954] px-5 py-3 font-extrabold">Download working pack (.md) ↓</button><button type="button" onClick={()=>{setShowSummary(false);setActive(0)}} className="rounded-xl border border-[#EADFD3] px-5 py-3 font-bold">Return to units</button></div>
      <p className="text-[15px] text-[#9B1D20] font-semibold">No signatures, manager approvals, learner scores or final-course certificates are issued by this pilot.</p>
     </section>:
     <section className="min-w-0 rounded-[27px] border border-[#EADFD3] bg-white overflow-hidden">
      <div className="bg-[#FFFCF7] border-b border-[#EADFD3] px-6 py-6 sm:p-9">
       <div className="flex flex-wrap justify-between gap-3"><span className="font-black text-[15px] uppercase tracking-[.14em] text-[#A15F16]">Unit {String(active+1).padStart(2,"0")} of 12 · {unit.phase}</span><span className="text-[15px] font-bold text-[#9B1D20]">PILOT · OPEN FOR FEEDBACK</span></div>
       <h2 className="text-2xl sm:text-4xl font-black mt-4 tracking-tight">{unit.title}</h2>
       <p className="mt-3 text-lg text-[#665E57]">{unit.learn}</p>
       <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white border border-[#EADFD3] px-3 py-2 text-[15px] font-bold">Outcome: {unit.output}</span></div>
      </div>
      <div className="p-6 sm:p-9 space-y-8">
       <div><p className="text-[15px] font-black uppercase tracking-[.15em] text-[#00A859]">01 · Understand</p><h3 className="font-extrabold text-xl mt-2">The big idea</h3><p className="mt-3 leading-relaxed text-[#514C47]">{unit.idea}</p></div>
       <div className="border-l-4 border-[#FAA954] rounded-r-xl bg-[#FFF6E8] p-5"><p className="text-[15px] font-black uppercase tracking-widest text-[#A15F16]">Illustrative business situation — not verified Aspectus data</p><p className="mt-2 text-[#514C47]">{unit.caseStudy}</p></div>
       <div><p className="text-[15px] font-black uppercase tracking-[.15em] text-[#00A859]">02 · Demonstrate</p><h3 className="font-extrabold text-xl mt-2">Try it in your organization</h3><p className="mt-3 leading-relaxed text-[#514C47]">{unit.tryIt}</p></div>
       <div className="space-y-5"><p className="text-[15px] font-black uppercase tracking-[.15em] text-[#00A859]">03 · Apply · Working draft</p>
        {currentQuestions.map((p,j)=><div key={j} className="space-y-2"><label htmlFor={"answer-"+active+"-"+j} className="block text-lg font-extrabold">{p.label}</label><p className="text-base text-[#6B6466]">{p.hint}</p><textarea id={"answer-"+active+"-"+j} className="w-full min-h-[120px] rounded-xl border border-[#DCCFC0] bg-[#FFFEFB] p-4 text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#FAA954]" rows={4} value={data.notes[key(active,j)]||""} placeholder="Write a rough draft, evidence to validate, or a question for the facilitator…" onChange={e=>{const val=e.target.value;change(d=>({...d,notes:{...d.notes,[key(active,j)]:val}}))}}/></div>)}
        <p className="text-[15px] text-[#6B6466]">Answers are working notes only. They are saved locally as you type, not submitted to management.</p>
       </div>
       <div className="rounded-xl border border-[#EADFD3] overflow-hidden"><button type="button" className="w-full px-5 py-4 bg-[#F8F5F0] flex items-center justify-between font-extrabold text-left" onClick={()=>setShowFacilitator(x=>!x)} aria-expanded={showFacilitator}><span>Facilitator notes and quality check</span><span>{showFacilitator?"−":"+"}</span></button>{showFacilitator&&<div className="p-5 space-y-3"><p><strong>Challenge question:</strong> {unit.facilitator}</p><p><strong>Watch-out:</strong> {unit.watchout}</p><p><strong>Evidence of application:</strong> {unit.output} reviewed by a human facilitator or decision owner.</p></div>}</div>
       <div className="border-t border-[#EADFD3] pt-6">
        <label className="block text-base font-extrabold" htmlFor={"pilot-feedback-"+active}>Pilot feedback: what was confusing, too easy or missing?</label><textarea id={"pilot-feedback-"+active} rows={2} placeholder="What would make this unit more useful to a real leader?" className="mt-2 w-full rounded-xl border border-[#DCCFC0] p-3 text-base" value={data.feedback["u"+(active+1)]||""} onChange={e=>{const val=e.target.value;change(d=>({...d,feedback:{...d.feedback,["u"+(active+1)]:val}}))}}/>
        <div className="mt-5 flex flex-wrap gap-2 items-center justify-between">
         <button type="button" className={"rounded-xl border px-4 py-3 text-base font-extrabold "+(data.discussed.includes(active)?"border-[#00A859] bg-[#D3F2E2] text-[#006B3C]":"border-[#EADFD3] bg-white")} onClick={()=>change(d=>({...d,discussed:d.discussed.includes(active)?d.discussed.filter(x=>x!==active):[...d.discussed,active].sort((a,b)=>a-b)}))}>{data.discussed.includes(active)?"✓ Discussed in pilot · Undo":"Mark as discussed in pilot"}</button>
         <div className="flex gap-2"><button type="button" disabled={active===0} className="rounded-xl border border-[#EADFD3] px-4 py-3 text-base font-bold disabled:opacity-40" onClick={()=>setActive(i=>Math.max(i-1,0))}>← Previous</button><button type="button" className="rounded-xl bg-[#FAA954] px-4 py-3 text-base font-extrabold" onClick={()=>{if(active===11)setShowSummary(true);else setActive(i=>Math.min(i+1,11))}}>{active===11?"Review working pack →":"Next unit →"}</button></div>
        </div>
       </div>
      </div>
     </section>}
   </div>
   <footer className="rounded-[25px] border border-[#EADFD3] p-5 sm:p-7 bg-white flex flex-wrap justify-between gap-4 items-start"><div className="max-w-3xl"><p className="text-[15px] uppercase tracking-wider font-black text-[#9B1D20]">Pilot review protocol</p><p className="text-base text-[#6B6466] mt-2 leading-relaxed">Before developing the final program: run these exercises with Aspectus leadership, challenge the proposed examples against real information, capture participant feedback, and check whether the resulting 90-day plan actually shapes decisions after 30 days. This prototype does not replace a facilitated leadership session.</p></div><button type="button" className="rounded-xl bg-[#373435] text-white px-5 py-3 text-base font-extrabold" onClick={exportNotes}>Export notes + pilot feedback ↓</button></footer>
  </div>
 </main>;
}
