/* eslint-disable react/no-unescaped-entities */
"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";

const db=createClient();
type Mod={id:string;title:string;is_active:boolean;order_index:number};
type Quiz={module_id:string;passed:boolean;score:number;submitted_at:string};
type Progress={module_id:string;stage_index:number;stage_count:number;updated_at:string};
type Submission={id:string;module_id:string;status:string;submitted_at:string};
type Review={submission_id:string;decision:string;feedback:string|null;reviewed_at:string};
type Dataset={name:string;modules:Mod[];quizzes:Quiz[];stages:Progress[];submissions:Submission[];reviews:Review[]};
type ModuleRow={id:string;title:string;order_index:number;attempts:Quiz[];stage:Progress|undefined;submission:Submission|undefined;review:Review|undefined};
const card="rounded-[25px] border border-[#EADFD3] bg-white p-5 sm:p-6";
function stamp(s:string){return new Intl.DateTimeFormat("en-KE",{day:"numeric",month:"short",year:"numeric",timeZone:"Africa/Nairobi"}).format(new Date(s))}

export default function LearningProfile(){
 const [data,setData]=useState<Dataset|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 async function load(){
  setLoading(true);setError("");
  try{
   const {data:auth}=await db.auth.getUser();
   if(!auth.user)throw Error("Sign in to see your saved learning record.");
   const {data:user,error:profileError}=await db.from("users").select("id,org_id,full_name,is_active").eq("id",auth.user.id).maybeSingle();
   if(profileError||!user?.is_active)throw Error("Your active Aspectus account could not be loaded.");
   const [assignments,mods,quiz,progress,subs]=await Promise.all([
    db.from("aspectus_module_assignments").select("module_id").eq("learner_id",user.id),
    db.from("modules").select("id,title,is_active,order_index").eq("org_id",user.org_id).order("order_index"),
    db.from("aspectus_quiz_attempts").select("module_id,passed,score,submitted_at").eq("learner_id",user.id).order("submitted_at",{ascending:false}),
    db.from("aspectus_lesson_progress").select("module_id,stage_index,stage_count,updated_at").eq("learner_id",user.id),
    db.from("learning_submissions").select("id,module_id,status,submitted_at").eq("learner_id",user.id).order("submitted_at",{ascending:false})
   ]);
   const faults=[assignments.error,mods.error,quiz.error,progress.error,subs.error].filter(Boolean);
   if(faults.length)throw Error(faults.map(e=>e?.message).join("; "));
   const assigned=new Set((assignments.data||[]).map(a=>a.module_id));
   const submissions=subs.data||[];
   const ids=submissions.map(s=>s.id);
   const {data:reviews,error:reviewError}=ids.length?await db.from("learning_reviews")
     .select("submission_id,decision,feedback,reviewed_at").in("submission_id",ids):
     {data:[] as Review[],error:null};
   if(reviewError)throw reviewError;
   setData({
    name:user.full_name||"Team member",
    modules:(mods.data||[]).filter(m=>m.is_active&&assigned.has(m.id)),
    quizzes:quiz.data||[],stages:progress.data||[],submissions,
    reviews:reviews||[]
   });
  }catch(e){setData(null);setError(e instanceof Error?e.message:String(e))}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);
 const rows:ModuleRow[]=data?data.modules.map(m=>{
  const attempts=data.quizzes.filter(q=>q.module_id===m.id);
  const stage=data.stages.find(p=>p.module_id===m.id);
  const submission=data.submissions.find(s=>s.module_id===m.id);
  const review=submission?data.reviews.find(r=>r.submission_id===submission.id):undefined;
  return {...m,attempts,stage,submission,review};
 }):[];
 const started=rows.filter(r=>r.stage||r.attempts.length>0).length;
 const passed=rows.filter(r=>r.attempts.some(a=>a.passed)).length;
 const submitted=rows.filter(r=>r.submission).length;
 const actionRow=rows.find(r=>r.submission?.status==="revision_requested")||
  rows.find(r=>r.attempts.some(a=>a.passed)&&!r.submission)||
  rows.find(r=>!r.attempts.some(a=>a.passed))||null;
 const nextAction=actionRow?(actionRow.submission?.status==="revision_requested"?"Review feedback, revise your project and resubmit":
   actionRow.attempts.some(a=>a.passed)?"Complete and submit the practical assignment":"Continue the lesson and attempt the knowledge check"):"Review your completed work and reflect on what you can apply";
 return <main className="min-h-screen bg-[#FFFBF6] text-[#373435] text-lg leading-relaxed px-4 sm:px-7 py-8">
  <div className="max-w-5xl mx-auto space-y-6">
   <header className="rounded-[26px] border border-[#EADFD3] bg-white overflow-hidden">
    <div className="h-2 bg-[#FAA954]"/><div className="p-6 sm:p-9 flex flex-wrap justify-between items-center gap-4">
     <div><p className="text-lg uppercase tracking-[.14em] font-black text-[#A15F16]">Aspectus · Learning record pilot</p><h1 className="text-3xl sm:text-4xl font-black mt-2">My learning profile</h1><p className="text-[#6B6466] mt-3">An evidence-based view of how your learning is developing.</p></div>
     <div className="flex flex-wrap gap-2"><button onClick={()=>void load()} disabled={loading} className="rounded-xl bg-[#FAA954] px-4 py-3 font-extrabold disabled:opacity-50">↻ Refresh</button><Link href="/aspectus/profile" className="rounded-xl border border-[#EADFD3] px-4 py-3 font-bold">← My profile</Link></div>
    </div>
   </header>
   {loading&&<p className={card}>Reading your saved learning records…</p>}
   {error&&<p role="alert" className={card+" text-[#9B1D20]"}>{error}</p>}
   {data&&!loading&&<>
    <div className="rounded-2xl border-l-4 border-[#FAA954] bg-[#FFF3DF] p-5 text-lg"><strong>First version — not AI-personalized yet.</strong> This profile summarizes verified actions and suggests a next step using simple, transparent rules. It does not assess your personality, intelligence or potential.</div>
    <div className="grid sm:grid-cols-4 gap-3">
     {[["Assigned units",rows.length],["Lessons started",started],["Quizzes passed",passed],["Projects submitted",submitted]].map(([label,val])=><div key={label} className={card}><p className="text-lg text-[#6B6466]">{label}</p><p className="text-3xl font-black mt-3">{val}</p></div>)}
    </div>
    <section className={card+" space-y-3"}>
     <p className="text-base uppercase tracking-widest text-[#A15F16] font-black">Suggested next action · Based on your records</p>
     <h2 className="text-xl sm:text-2xl font-black">{nextAction}</h2>
     <p className="text-lg text-[#6B6466]">{actionRow?("In "+actionRow.title+". This suggestion comes from recorded quiz and assignment status, not an AI model."):("No unfinished assigned modules were found in your records.")}</p>
     <Link href="/aspectus" className="inline-block rounded-xl bg-[#FAA954] px-5 py-3 font-extrabold">Go to my learning home →</Link>
    </section>
    <section className={card+" space-y-4"}>
     <div><h2 className="text-xl sm:text-2xl font-black">Evidence by module</h2><p className="text-[#6B6466] mt-2">Actual quiz results and practical work are separate signals. A passed quiz alone doesn't prove that a skill is consistently applied at work.</p></div>
     {rows.length===0&&<p className="bg-[#FFF7EB] rounded-xl p-5">No published modules are assigned to your account yet. Your learning record will develop as your modules are assigned and you begin learning.</p>}
     {rows.map(r=>{
      const passedQuiz=r.attempts.find(q=>q.passed);
      return <article key={r.id} className="rounded-2xl border border-[#EADFD3] bg-[#FFFCF8] p-4 sm:p-5">
       <div className="flex flex-wrap justify-between gap-2 items-start"><div><p className="text-lg text-[#A15F16] font-bold">MODULE {String(r.order_index).padStart(2,"0")}</p><h3 className="font-black text-lg mt-1">{r.title}</h3></div><span className="text-lg rounded-full bg-white px-3 py-2 border border-[#EADFD3]">{r.submission?.status==="approved"||r.submission?.status==="approved_with_changes"?"Reviewed":r.submission?.status==="revision_requested"?"Changes requested":r.submission?.status==="submitted"?"Awaiting review":passedQuiz?"Quiz passed":r.stage?"In progress":"Not started"}</span></div>
       <div className="mt-4 flex flex-wrap gap-3 text-lg"><span className="rounded-lg bg-white px-3 py-2 border border-[#EADFD3]">Lesson steps: {r.stage?(r.stage.stage_index+1)+"/"+r.stage.stage_count:"Not recorded"}</span><span className="rounded-lg bg-white px-3 py-2 border border-[#EADFD3]">Quiz: {passedQuiz?"Passed ("+passedQuiz.score+"%)":r.attempts.length?"Attempted ("+r.attempts[0].score+"%)":"Not attempted"}</span><span className="rounded-lg bg-white px-3 py-2 border border-[#EADFD3]">Project: {r.submission?r.submission.status.replaceAll("_"," "):"Not submitted"}</span></div>
       {r.review&&<p className="text-lg text-[#6B6466] mt-3">Last recorded review: {r.review.decision.replaceAll("_"," ")} · {stamp(r.review.reviewed_at)}. Full feedback remains in your Hub.</p>}
      </article>
     })}
    </section>
    <section className={card}><h2 className="text-xl font-black">How this will become adaptive</h2><p className="mt-2 text-[#6B6466]">The next stage connects individual answers to explicit skill tags, examines repeated patterns across questions and applied work, and suggests an appropriate next practice activity. Reviewers will still judge real-world submissions; learners should be able to inspect and correct recommendations.</p><p className="text-lg mt-3 font-semibold text-[#9B1D20]">Not yet built: per-answer skill scoring, AI-generated coaching, cross-course mastery, or personalized lesson branching.</p></section>
   </>}
  </div>
 </main>;
}
