"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

const db=createClient();
const SLUG="clear-workplace-communication";
const STAGES=[
 {short:"Baseline",name:"Your starting point",duration:"5 min"},
 {short:"Notice",name:"What is missing?",duration:"2 min"},
 {short:"Learn",name:"Lead with the point",duration:"4 min"},
 {short:"Decide",name:"Choose the clearer message",duration:"2 min"},
 {short:"Practise",name:"Write a better message",duration:"4 min"},
 {short:"Reflect",name:"Make it a habit",duration:"2 min"}
];
type AnswerState={baseline:string;observation:string;choice:string;rewrite:string;checks:string[];reflection:string;lesson1Complete:boolean};
const empty:AnswerState={baseline:"",observation:"",choice:"",rewrite:"",checks:[],reflection:"",lesson1Complete:false};
const checks=[
 {id:"point",label:"The first line says exactly what is missing."},
 {id:"why",label:"I explain why the information is needed."},
 {id:"ask",label:"I ask one person to take a specific action."},
 {id:"timing",label:"I give a reasonable time or ask when the information can be supplied."}
];
type Session={id:string;orgId:string;moduleId:string;name:string;admin:boolean};
function Chip({children}:{children:React.ReactNode}){return <span className="inline-flex rounded-full border border-[#EADFD3] bg-white px-3 py-1 text-xs font-bold text-[#736961]">{children}</span>}
export default function CommunicationLesson(){
 const [session,setSession]=useState<Session|null>(null);
 const [loading,setLoading]=useState(true);
 const [authError,setAuthError]=useState("");
 const [stage,setStage]=useState(0);
 const [unlocked,setUnlocked]=useState(0);
 const [data,setData]=useState<AnswerState>(empty);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [feedback,setFeedback]=useState("");
 const [savedAt,setSavedAt]=useState("");
 useEffect(()=>{
  let mounted=true;
  (async()=>{
   try{
    const {data:{user},error:authError}=await db.auth.getUser();
    if(authError||!user)throw new Error("Sign in to the Learning Hub to open this course.");
    const {data:profile,error:profileError}=await db.from("users").select("id,org_id,full_name,role,is_active").eq("id",user.id).maybeSingle();
    if(profileError||!profile?.is_active)throw new Error("Your Aspectus learning account is not active.");
    const {data:mod,error:modError}=await db.from("modules").select("id,org_id,is_active").eq("org_id",profile.org_id).eq("slug",SLUG).maybeSingle();
    if(modError||!mod)throw new Error("This course has not been added to your organization.");
    const {data:isAdmin}=await db.rpc("aspectus_can_admin",{p_org_id:profile.org_id});
    if(!isAdmin){
     if(!mod.is_active)throw new Error("This course is still being prepared and is available to administrators for preview only.");
     const {data:assignment}=await db.from("aspectus_module_assignments").select("module_id")
      .eq("learner_id",user.id).eq("module_id",mod.id).maybeSingle();
     if(!assignment)throw new Error("This course has not been assigned to your account.");
    }
    const {data:progress,error:progressError}=await db.from("aspectus_lesson_progress")
     .select("stage_index,lesson_state,updated_at").eq("learner_id",user.id).eq("module_id",mod.id).maybeSingle();
    if(progressError)throw progressError;
    if(!mounted)return;
    const progressState=(progress?.lesson_state&&typeof progress.lesson_state==="object"?progress.lesson_state:{}) as Partial<AnswerState>;
    setData({...empty,...progressState,checks:Array.isArray(progressState.checks)?progressState.checks:[]});
    const position=Math.max(0,Math.min(STAGES.length,Number(progress?.stage_index)||0));
    setUnlocked(position);setStage(Math.min(STAGES.length-1,position));
    setSavedAt(progress?.updated_at?new Date(progress.updated_at).toLocaleString():"");
    setSession({id:user.id,orgId:profile.org_id,moduleId:mod.id,name:profile.full_name||"Learner",admin:!!isAdmin});
   }catch(e){if(mounted)setAuthError(e instanceof Error?e.message:"Could not load this course.");}
   finally{if(mounted)setLoading(false);}
  })();
  return()=>{mounted=false};
 },[]);
 async function persist(nextStage:number,nextData:AnswerState){
  if(!session)return false;
  setBusy(true);setNotice("");
  const updatedAt=new Date().toISOString();
  const progressIndex=Math.max(unlocked,nextStage);
  const {error}=await db.from("aspectus_lesson_progress").upsert({
   org_id:session.orgId,learner_id:session.id,module_id:session.moduleId,
   stage_index:progressIndex,stage_count:STAGES.length,lesson_state:nextData,updated_at:updatedAt
  },{onConflict:"learner_id,module_id"});
  setBusy(false);
  if(error){setNotice("We couldn't save this step: "+error.message);return false;}
  setUnlocked(progressIndex);setSavedAt(new Date(updatedAt).toLocaleString());return true;
 }
 async function advance(){
  setFeedback("");setNotice("");
  if(stage===0&&data.baseline.trim().length<25){setFeedback("Write a short message first. Don't worry about getting it perfect.");return;}
  if(stage===1&&data.observation!=="missing"){setFeedback("Think about what the recipient needs before they can act. Try the second option.");return;}
  if(stage===3&&data.choice!=="b"){setFeedback("Message B works better because it names the missing information, explains why and suggests a time.");return;}
  if(stage===4&&(data.rewrite.trim().length<40||data.checks.length<3)){setFeedback("Write your full message, then use at least three checklist items to review it.");return;}
  if(stage===5&&data.reflection.trim().length<20){setFeedback("Name one communication habit you will use in a real work message.");return;}
  const complete=stage===STAGES.length-1;
  const nextData={...data,lesson1Complete:complete||data.lesson1Complete};
  if(await persist(complete?STAGES.length:stage+1,nextData)){
   setData(nextData);setStage(Math.min(stage+1,STAGES.length-1));
   if(complete)setNotice("Lesson 1 is complete. This is a preview, not a final course assessment or certificate.");
   else setNotice("Saved. Continue at your own pace.");
  }
 }
 async function saveProgress(){if(await persist(stage,data))setNotice("Your work has been saved to your learning account.");}
 const panel="rounded-[26px] border border-[#EADFD3] bg-white p-5 sm:p-8 shadow-[0_15px_40px_rgba(55,52,53,0.05)]";
 const field="w-full rounded-2xl border border-[#D7CFC5] bg-[#FFFEFC] px-4 py-4 text-[#373435] text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#FAA954]";
 if(loading)return <main className="min-h-screen grid place-items-center bg-[#FFFBF6] p-6"><p className="text-[#373435] font-bold">Opening your learning experience…</p></main>;
 if(authError)return <main className="min-h-screen grid place-items-center bg-[#FFFBF6] p-6"><section className={panel+" max-w-lg text-center"}><h1 className="text-2xl font-extrabold">Learning access</h1><p className="mt-3 text-[#6B6466]">{authError}</p><Link className="inline-block mt-5 rounded-xl px-5 py-3 bg-[#FAA954] font-extrabold" href="/aspectus">Back to Learning Hub</Link></section></main>;
 if(!session)return null;
 return <main className="min-h-screen bg-[#FFFBF6] text-[#373435]">
  <header className="border-b border-[#EADFD3] bg-white"><div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex flex-wrap justify-between items-center gap-4">
   <div><p className="text-xs tracking-[.16em] font-extrabold uppercase text-[#A55F12]">Aspectus Learning Hub · Professional Skills</p><p className="font-extrabold text-lg mt-1">Clear Workplace Communication</p></div>
   <Link href={session.admin?"/aspectus/admin":"/aspectus"} className="rounded-xl border border-[#EADFD3] px-4 py-2.5 text-sm font-extrabold hover:bg-[#FFF3E3]">← Back to Learning Hub</Link>
  </div></header>
  <div className="max-w-6xl mx-auto px-5 sm:px-8 py-7 sm:py-10 space-y-6">
   <section className="rounded-[30px] overflow-hidden border border-[#E8CFAE]">
    <div className="h-2 bg-[#FAA954]"/>
    <div className="p-6 sm:p-9 bg-gradient-to-br from-[#FFF0D8] via-[#FFFBF6] to-white">
     <div className="flex flex-wrap gap-2"><Chip>Professional Skills · Course 01</Chip><Chip>All roles</Chip><Chip>Guided practice</Chip>{session.admin&&<span className="rounded-full bg-[#373435] px-3 py-1 text-xs font-extrabold text-white">Admin preview · not assigned to staff</span>}</div>
     <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-5">Communicate clearly. Build trust. Move work forward.</h1>
     <p className="text-base sm:text-lg text-[#6B6466] mt-3 max-w-2xl">Start with your own words, learn one practical technique, make a decision, then write a clearer message for your team.</p>
     <div className="flex flex-wrap gap-3 mt-6 items-center"><span className="font-bold text-sm">Baseline + Lesson 1</span><span className="text-sm text-[#6B6466]">~19 minutes · 6 small steps</span></div>
    </div>
   </section>
   <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-5 items-start">
    <aside className={panel+" lg:sticky lg:top-5 !p-5"}>
     <p className="text-xs tracking-widest text-[#A55F12] font-extrabold">YOUR LEARNING PATH</p>
     <div className="mt-4 h-2 rounded-full bg-[#F2EBE2] overflow-hidden"><div className="bg-[#00A859] h-full transition-all" style={{width:(100*unlocked/STAGES.length)+"%"}}/></div>
     <p className="mt-2 text-sm text-[#6B6466]">{Math.min(unlocked,STAGES.length)} of {STAGES.length} steps completed</p>
     <ol className="space-y-2 mt-6">{STAGES.map((s,i)=><li key={s.short}>
      <button type="button" disabled={i>unlocked||busy} onClick={()=>{if(i<=unlocked){setStage(i);setFeedback("");setNotice("");}}} className={"w-full text-left flex gap-3 items-center rounded-xl p-3 "+(stage===i?"bg-[#FEEBD5] border border-[#FAA954]":i<unlocked?"bg-[#F4FFF8]":"bg-[#F7F5F2] opacity-55")}>
       <span className={"w-8 h-8 rounded-full shrink-0 grid place-items-center text-sm font-extrabold "+(i<unlocked?"bg-[#00A859] text-white":stage===i?"bg-[#FAA954]":"bg-[#D9D4CD]")}>{i<unlocked?"✓":i+1}</span>
       <span><strong className="text-sm block">{s.short}</strong><span className="text-xs text-[#6B6466]">{s.duration}</span></span>
      </button>
     </li>)}</ol>
     {savedAt&&<p className="mt-5 text-xs text-[#6B6466]">Last saved: {savedAt}</p>}
    </aside>
    <section className={panel}>
     <div className="flex justify-between gap-3 items-center"><p className="text-xs font-black tracking-[.15em] uppercase text-[#A55F12]">Step {stage+1} of {STAGES.length} · {STAGES[stage].short}</p><span className="text-xs font-bold text-[#6B6466]">{STAGES[stage].duration}</span></div>
     <h2 className="text-2xl sm:text-3xl font-black mt-3">{STAGES[stage].name}</h2>
     {stage===0&&<div className="space-y-5 mt-6">
      <p className="text-lg">Before we show you any techniques, we'd like to see how you communicate naturally. This is a starting point, not a test.</p>
      <div className="rounded-2xl bg-[#FFF1DF] p-5 border border-[#F2D9B6]"><strong className="block text-sm text-[#8B572B] uppercase tracking-wide">The situation</strong><p className="mt-3">A homeowner's installation will be delayed by two days because equipment arrived late. The team has not yet confirmed a new installation date. Write the WhatsApp message you would send to the customer.</p></div>
      <label className="block font-extrabold" htmlFor="baseline">Your message</label>
      <textarea id="baseline" value={data.baseline} onChange={e=>setData(d=>({...d,baseline:e.target.value}))} rows={6} className={field} placeholder="Hello…"/>
      <p className="text-sm text-[#6B6466]">We'll compare this with your work at the end of the full course. Don't invent a new date that hasn't been confirmed.</p>
     </div>}
     {stage===1&&<div className="space-y-5 mt-6">
      <p className="text-lg">Imagine you're preparing a quotation. A colleague sends you this WhatsApp:</p>
      <blockquote className="rounded-2xl bg-[#F4F2EF] border-l-4 border-[#D0C9C0] p-5 text-lg">“Hi, still missing details. Please send them ASAP.”</blockquote>
      <p className="font-extrabold">What's the biggest problem with the message?</p>
      <div className="space-y-3">{[
       {id:"polite",text:"It doesn't use a long enough greeting."},
       {id:"missing",text:"It doesn't say which details are missing, why they matter or by when they're needed."},
       {id:"long",text:"It needs more background about the entire project."}
      ].map(o=><label key={o.id} className={"flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 "+(data.observation===o.id?"border-[#FAA954] bg-[#FFF4E6]":"border-[#EADFD3]")}><input type="radio" name="observe" value={o.id} checked={data.observation===o.id} onChange={()=>{setData(d=>({...d,observation:o.id}));setFeedback("");}} className="mt-1 h-5 w-5 accent-[#FAA954]"/><span>{o.text}</span></label>)}</div>
      {data.observation==="missing"&&<p className="rounded-xl bg-[#D3F2E2] p-4 text-[#006B3B] font-semibold">Exactly. Clarity reduces back-and-forth by helping a person act.</p>}
     </div>}
     {stage===2&&<div className="space-y-6 mt-6">
      <p className="text-lg">For everyday work messages, start with what the reader needs most. Then give enough context to explain the situation and finish with a practical next step.</p>
      <div className="grid sm:grid-cols-3 gap-3">{[
       {n:"01",title:"Point",desc:"What happened, or what do you need?"},
       {n:"02",title:"Why",desc:"What is the reason or consequence?"},
       {n:"03",title:"Action",desc:"Who should do what, and by when?"}
      ].map(x=><div key={x.n} className="rounded-2xl border border-[#EADFD3] bg-[#FFF9F0] p-4"><p className="font-black text-[#B5732C] text-sm">{x.n}</p><h3 className="text-xl font-black mt-2">{x.title}</h3><p className="text-sm mt-2 text-[#6B6466]">{x.desc}</p></div>)}</div>
      <div className="rounded-2xl bg-[#F3FFF8] p-5 border border-[#B7E4C8]"><p className="font-extrabold text-[#00753E] uppercase text-sm">A clearer version</p><p className="mt-3 leading-relaxed">“Hi, we need the customer's location and load requirements to prepare the quotation. Could you send both by 2 pm today, or tell me when they will be available? That will help us confirm when we can finish the quote.”</p></div>
      <p className="text-sm text-[#6B6466]"><strong>Remember:</strong> Being direct isn't the same as being rude. A concise greeting, honest explanation and reasonable request can all fit into a short message. Avoid unnecessary promises.</p>
     </div>}
     {stage===3&&<div className="space-y-5 mt-6">
      <p className="text-lg">Your technical colleague needs the customer's location and load requirements to prepare a quotation. Which WhatsApp is more useful?</p>
      <div className="space-y-3">{[
       {id:"a",title:"Message A",body:"Hi, we still don't have the details. Please send them ASAP."},
       {id:"b",title:"Message B",body:"Hi, could you send the customer's location and load requirements by 2 pm? We need both to complete the quotation. If that timing won't work, please tell me when you can share them."}
      ].map(o=><label key={o.id} className={"block cursor-pointer rounded-2xl border-2 p-5 "+(data.choice===o.id?"border-[#FAA954] bg-[#FFF4E6]":"border-[#EADFD3]")}><span className="flex items-center gap-3"><input type="radio" name="compare" checked={data.choice===o.id} onChange={()=>{setData(d=>({...d,choice:o.id}));setFeedback("");}} className="w-5 h-5 accent-[#FAA954]"/><strong>{o.title}</strong></span><p className="mt-3 ml-8 leading-relaxed">{o.body}</p></label>)}</div>
      {data.choice==="b"&&<p className="rounded-xl bg-[#D3F2E2] p-4 text-[#006B3B] font-semibold">Good choice. The reader knows what's missing, why it matters and the requested timing, with room to flag a problem.</p>}
     </div>}
     {stage===4&&<div className="space-y-5 mt-6">
      <p className="text-lg">Now try it yourself. You're on the technical team and need the sales colleague to provide the customer's location and load requirements. A quotation is waiting.</p>
      <blockquote className="rounded-2xl bg-[#F4F2EF] border-l-4 border-[#D0C9C0] p-5">Original message: “Hi. Please send the info ASAP.”</blockquote>
      <label className="block font-extrabold" htmlFor="rewrite">Rewrite the WhatsApp message</label>
      <textarea id="rewrite" value={data.rewrite} onChange={e=>setData(d=>({...d,rewrite:e.target.value}))} rows={6} className={field} placeholder="Hi, could you…"/>
      <div className="rounded-2xl border border-[#EADFD3] bg-[#FFFBF6] p-5"><p className="font-extrabold">Self-check your message</p><p className="text-sm text-[#6B6466] mt-1">Select the statements that are true of your draft. This is practice, not an AI-generated grade.</p><div className="space-y-3 mt-4">{checks.map(x=><label key={x.id} className="flex gap-3 items-start cursor-pointer"><input type="checkbox" checked={data.checks.includes(x.id)} onChange={()=>setData(d=>({...d,checks:d.checks.includes(x.id)?d.checks.filter(v=>v!==x.id):[...d.checks,x.id]}))} className="h-5 w-5 mt-1 accent-[#00A859]"/><span>{x.label}</span></label>)}</div></div>
     </div>}
     {stage===5&&<div className="space-y-5 mt-6">
      <p className="text-lg">You've practised putting the point and action first. The same habit works when sharing project updates, requesting documents, raising problems and speaking with customers.</p>
      <div className="rounded-2xl border border-[#B7E4C8] bg-[#F3FFF8] p-5"><strong className="text-[#00753E]">Your practice message is saved</strong><p className="text-sm mt-2 text-[#526B5B]">It is not a graded submission. Your reviewer will evaluate a final assignment once the full communication course is ready.</p></div>
      <label htmlFor="reflection" className="block font-extrabold">What is one habit you'll use in your next work message?</label>
      <textarea id="reflection" rows={4} value={data.reflection} onChange={e=>setData(d=>({...d,reflection:e.target.value}))} className={field} placeholder="The next time I need to ask a colleague for something, I will…"/>
      {data.lesson1Complete&&<p className="rounded-2xl bg-[#D3F2E2] p-5 text-[#006B3B] font-extrabold">✓ Lesson 1 completed. Your baseline, practice and reflection are saved.</p>}
      <div className="rounded-2xl bg-[#FFF1DF] p-5"><strong className="block">Coming next in Clear Workplace Communication</strong><p className="mt-2 text-[#6B6466]">Know your reader · Right channel, right time · Make requests people can act on · Speak clearly and listen actively.</p></div>
     </div>}
     {feedback&&<p role="alert" className="mt-6 rounded-xl border-l-4 border-[#9B1D20] bg-[#FFF1EF] p-4 text-[#7C1F20] font-semibold">{feedback}</p>}
     {notice&&<p role="status" className="mt-6 rounded-xl border-l-4 border-[#00A859] bg-[#F3FFF8] p-4 text-[#006B3B] font-semibold">{notice}</p>}
     <div className="mt-8 pt-6 border-t border-[#EADFD3] flex flex-wrap justify-between gap-3 items-center">
      <div className="flex flex-wrap gap-3"><button type="button" disabled={stage===0||busy} onClick={()=>{setStage(s=>Math.max(0,s-1));setFeedback("");setNotice("");}} className="rounded-xl border border-[#EADFD3] px-5 py-3 font-extrabold disabled:opacity-40">← Previous</button><button type="button" disabled={busy} onClick={()=>void saveProgress()} className="rounded-xl border border-[#EADFD3] px-5 py-3 font-extrabold disabled:opacity-40">{busy?"Saving…":"Save progress"}</button></div>
      <button type="button" disabled={busy||(stage===5&&data.lesson1Complete)} onClick={()=>void advance()} className="rounded-xl bg-[#FAA954] px-6 py-3.5 font-extrabold disabled:opacity-50">{busy?"Saving…":stage===5?(data.lesson1Complete?"Lesson saved ✓":"Finish Lesson 1 →"):"Save & continue →"}</button>
     </div>
    </section>
   </div>
   <p className="text-sm text-center text-[#8C8176] pb-5">Professional Skills · Learn by doing · Understand → Demonstrate → Apply</p>
  </div>
 </main>;
}
