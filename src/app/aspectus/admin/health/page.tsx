/* eslint-disable react/no-unescaped-entities */
"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

const db=createClient();

type Member={id:string;full_name:string|null;email:string;role:string;is_active:boolean};
type Course={id:string;title:string;is_active:boolean;order_index:number};
type Assignment={learner_id:string;module_id:string};
type LessonSave={learner_id:string;module_id:string;stage_index:number;stage_count:number;updated_at:string};
type QuizSave={learner_id:string;module_id:string;passed:boolean;submitted_at:string};
type Submission={id:string;learner_id:string;module_id:string;status:string;submitted_at:string};
type ReviewerAccess={reviewer_id:string;learner_id:string};
type SaveError={id:string;actor_id:string;module_id:string|null;operation:string;error_code:string;occurred_at:string};
type Snapshot={
 members:Member[];courses:Course[];assignments:Assignment[];lessons:LessonSave[];
 quizzes:QuizSave[];submissions:Submission[];reviewers:ReviewerAccess[];
 errors:SaveError[];errorCount:number;checkedAt:string;
};
const card="rounded-[25px] border border-[#EADFD3] bg-white p-5 sm:p-6";
const formatTime=(value:string)=>{
 const time=Date.parse(value);
 return Number.isFinite(time)?new Intl.DateTimeFormat("en-KE",{
  day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",
  timeZone:"Africa/Nairobi"
 }).format(new Date(time))+" EAT":"Not recorded";
};
const operationName:Record<string,string>={
 lesson_progress:"Lesson progress",quiz_result:"Quiz result",
 assignment_upload:"Attachment upload",assignment_submission:"Assignment submission",
 review_draft:"Review draft",review_decision:"Review decision"
};
function newest<T>(rows:T[],key:(item:T)=>string):T[]{
 return [...rows].sort((a,b)=>Date.parse(key(b))-Date.parse(key(a)));
}
function Status({status}:{status:"good"|"warning"|"neutral"}){
 return <span className={"inline-flex h-2.5 w-2.5 shrink-0 rounded-full "+
 (status==="good"?"bg-[#00A859]":status==="warning"?"bg-[#9B1D20]":"bg-[#AAA39C]")}/>;
}

export default function AspectusHealth(){
 const [data,setData]=useState<Snapshot|null>(null);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState("");
 const [notAllowed,setNotAllowed]=useState(false);
 const load=useCallback(async()=>{
  setBusy(true);
  setError("");
  try{
   const {data:auth,error:authError}=await db.auth.getUser();
   if(authError||!auth.user)throw Error("Please sign in to your Aspectus Super Admin account.");
   const {data:profile,error:profileError}=await db.from("users")
    .select("id,org_id,role,is_active").eq("id",auth.user.id).maybeSingle();
   if(profileError)throw profileError;
   if(!profile?.is_active||profile.role!=="org_admin"){
    setNotAllowed(true);
    setData(null);
    return;
   }
   const {data:allowed,error:permissionError}=await db.rpc("aspectus_can_admin",{p_org_id:profile.org_id});
   if(permissionError)throw permissionError;
   if(!allowed){setNotAllowed(true);setData(null);return;}
   setNotAllowed(false);
   const org=profile.org_id;
   const sevenDaysAgo=new Date(Date.now()-7*24*60*60*1000).toISOString();
   const [u,m,a,l,q,s,r,e]=await Promise.all([
    db.from("users").select("id,full_name,email,role,is_active").eq("org_id",org).order("full_name"),
    db.from("modules").select("id,title,is_active,order_index").eq("org_id",org),
    db.from("aspectus_module_assignments").select("learner_id,module_id").eq("org_id",org),
    db.from("aspectus_lesson_progress").select("learner_id,module_id,stage_index,stage_count,updated_at").eq("org_id",org),
    db.from("aspectus_quiz_attempts").select("learner_id,module_id,passed,submitted_at").eq("org_id",org),
    db.from("learning_submissions").select("id,learner_id,module_id,status,submitted_at").eq("org_id",org),
    db.from("aspectus_reviewer_assignments").select("reviewer_id,learner_id").eq("org_id",org),
    db.from("aspectus_save_errors")
     .select("id,actor_id,module_id,operation,error_code,occurred_at",{count:"exact"})
     .eq("org_id",org).gte("occurred_at",sevenDaysAgo).order("occurred_at",{ascending:false}).limit(100)
   ]);
   const readErrors=[u.error,m.error,a.error,l.error,q.error,s.error,r.error,e.error].filter(Boolean);
   if(readErrors.length)throw Error("Could not load all health checks: "+readErrors.map(x=>x!.message).join("; "));
   setData({
    members:u.data||[],courses:m.data||[],assignments:a.data||[],lessons:l.data||[],
    quizzes:q.data||[],submissions:s.data||[],reviewers:r.data||[],errors:e.data||[],
    errorCount:e.count||0,checkedAt:new Date().toISOString()
   });
  }catch(caught){
   setData(null);
   setError(caught instanceof Error?caught.message:"Unable to check Learning Hub health.");
  }finally{setBusy(false);}
 },[]);
 useEffect(()=>{void load()},[load]);

 const summary=useMemo(()=>{
  if(!data)return null;
  const membersById=new Map(data.members.map(m=>[m.id,m]));
  const coursesById=new Map(data.courses.map(m=>[m.id,m]));
  const learners=data.members.filter(m=>m.is_active&&m.role==="employee");
  const assigned=data.assignments.filter(a=>coursesById.get(a.module_id)?.is_active);
  const learnersWithCourses=learners.filter(m=>assigned.some(a=>a.learner_id===m.id));
  const reviewers=data.members.filter(m=>m.is_active&&(m.role==="manager"||m.role==="hr_manager"));
  const assignedReviewer=(learnerId:string)=>reviewers.filter(m=>data.reviewers.some(r=>r.learner_id===learnerId&&r.reviewer_id===m.id));
  const latestByCourse=new Map<string,Submission>();
  for(const submission of newest(data.submissions,s=>s.submitted_at)){
   const key=submission.learner_id+":"+submission.module_id;
   if(!latestByCourse.has(key))latestByCourse.set(key,submission);
  }
  const recentSubmissions=[...latestByCourse.values()];
  const pending=recentSubmissions.filter(s=>s.status==="submitted");
  const uncovered=learnersWithCourses.filter(m=>assignedReviewer(m.id).length===0);
  const rows=learnersWithCourses.map(m=>{
   const myAssigned=assigned.filter(a=>a.learner_id===m.id).map(a=>a.module_id);
   const myStages=data.lessons.filter(p=>p.learner_id===m.id&&myAssigned.includes(p.module_id));
   const myQuizzes=data.quizzes.filter(q=>q.learner_id===m.id&&myAssigned.includes(q.module_id));
   const mySubmissions=recentSubmissions.filter(s=>s.learner_id===m.id&&myAssigned.includes(s.module_id));
   const quizCount=new Set(myQuizzes.filter(q=>q.passed).map(q=>q.module_id)).size;
   const submittedCount=mySubmissions.filter(s=>["submitted","approved","approved_with_changes","revision_requested"].includes(s.status)).length;
   const recentSave=newest([
    ...myStages.map(p=>({time:p.updated_at,type:"Lesson step"})),
    ...myQuizzes.map(q=>({time:q.submitted_at,type:"Quiz"})),
    ...mySubmissions.map(s=>({time:s.submitted_at,type:"Assignment"}))
   ],r=>r.time)[0]||null;
   return {...m,assigned:myAssigned.length,stageCount:myStages.length,passed:quizCount,
    submitted:submittedCount,recentSave,reviewers:assignedReviewer(m.id)};
  });
  return {
   rows,learnersWithCourses,withWrites:rows.filter(r=>r.recentSave).length,
   pending:newest(pending,s=>s.submitted_at).reverse(),uncovered,reviewers,
   membersById,coursesById
  };
 },[data]);

 return <main className="min-h-screen bg-[#FFFBF6] text-[#373435] px-4 sm:px-7 py-7 sm:py-10">
  <div className="max-w-6xl mx-auto space-y-6">
   <header className="rounded-[28px] overflow-hidden border border-[#EADFD3] bg-white">
    <div className="h-2 bg-[#FAA954]"/>
    <div className="p-6 sm:p-9 flex flex-wrap justify-between items-start gap-5">
     <div>
      <p className="text-xs uppercase tracking-[.18em] font-extrabold text-[#A55F12]">Aspectus Learning Hub · Super Admin only</p>
      <h1 className="text-3xl sm:text-4xl font-black mt-3">Learning Hub health</h1>
      <p className="text-[#6B6466] mt-3 max-w-2xl leading-relaxed">A read-only check of saved learning records, review queues, reviewer permissions and reported save failures. This page does not change anyone's progress or assignments.</p>
     </div>
     <div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>void load()} disabled={busy} className="rounded-xl bg-[#FAA954] px-4 py-3 font-extrabold disabled:opacity-50">{busy?"Checking…":"↻ Refresh checks"}</button>
      <Link href="/aspectus" className="rounded-xl border border-[#EADFD3] px-4 py-3 font-bold hover:border-[#FAA954]">← Back to Hub</Link>
     </div>
    </div>
   </header>

   {busy&&<p className={card+" text-[#6B6466]"} role="status">Checking current records and permissions…</p>}
   {notAllowed&&!busy&&<div className={card} role="alert"><h2 className="text-xl font-black">Super Admin access required</h2><p className="mt-2 text-[#6B6466]">This operational dashboard is limited to active Aspectus Super Admin accounts.</p></div>}
   {error&&!busy&&<div className={card} role="alert"><h2 className="text-xl font-black text-[#9B1D20]">Health check unavailable</h2><p className="text-[#6B6466] mt-2">{error}</p><p className="text-sm mt-3">No zero counts are displayed because the underlying records could not be checked completely.</p></div>}
   {data&&summary&&!busy&&<>
    <p className="text-xs text-[#6B6466]">Checked {formatTime(data.checkedAt)} · Click Refresh to check again. Only active learners with published module assignments are counted below.</p>
    <section aria-label="Health summary" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
     <div className={card}><p className="text-xs uppercase font-black tracking-wider text-[#6B6466]">Learners with saved activity</p><p className="text-3xl font-black mt-3">{summary.withWrites}<span className="text-base text-[#6B6466]">/{summary.rows.length}</span></p><p className="text-sm text-[#6B6466] mt-2">At least one lesson, quiz or assignment saved to the database</p></div>
     <div className={card}><p className="text-xs uppercase font-black tracking-wider text-[#6B6466]">Assignments awaiting review</p><p className="text-3xl font-black mt-3">{summary.pending.length}</p><p className="text-sm text-[#6B6466] mt-2">Latest submitted assignment per learner and module</p></div>
     <div className={card}><p className="text-xs uppercase font-black tracking-wider text-[#6B6466]">Reviewer coverage</p><p className="text-3xl font-black mt-3">{summary.rows.length-summary.uncovered.length}<span className="text-base text-[#6B6466]">/{summary.rows.length}</span></p><p className="text-sm text-[#6B6466] mt-2">Learners linked to an active, designated reviewer</p></div>
     <div className={card}><p className="text-xs uppercase font-black tracking-wider text-[#6B6466]">Captured save errors · 7 days</p><p className="text-3xl font-black mt-3">{data.errorCount}</p><p className="text-sm text-[#6B6466] mt-2">Only failures successfully reported by instrumented save flows</p></div>
    </section>

    <section className={card+" space-y-4"} aria-label="Issues needing attention">
     <div className="flex gap-3 items-start"><Status status={summary.uncovered.length?"warning":"good"}/><div>
      <h2 className="text-xl font-black">Reviewer access</h2>
      {summary.uncovered.length?<p className="mt-1 text-[#9B1D20] font-semibold">{summary.uncovered.length} learner{summary.uncovered.length===1?" is":"s are"} missing an assigned reviewer: {summary.uncovered.map(m=>m.full_name||m.email).join(", ")}.</p>:<p className="mt-1 text-[#6B6466]">All assigned active learners have a designated, active reviewer.</p>}
      <Link className="inline-block mt-2 font-bold underline text-[#A55F12]" href="/aspectus/admin?view=people">Inspect reviewer assignments</Link>
     </div></div>
     <div className="border-t border-[#EADFD3] pt-4 flex gap-3 items-start"><Status status={data.errorCount?"warning":"neutral"}/><div>
      <h3 className="font-black">Save error monitoring</h3>
      <p className="text-sm text-[#6B6466] mt-1">{data.errorCount?"Some monitored save attempts returned errors. Review the list below.":"No save errors have been captured in the last seven days."} Monitoring started with this Health feature; earlier incidents are not backfilled. If the Hub is offline, an error report may also fail to reach the server.</p>
     </div></div>
    </section>

    <section className={card+" overflow-x-auto"}>
     <div className="mb-4"><h2 className="text-xl font-black">Learning records by person</h2><p className="mt-2 text-sm text-[#6B6466]">These are server-side save receipts, not live typing indicators. Older timestamps may simply mean a learner has not returned recently.</p></div>
     <table className="min-w-[750px] w-full text-sm text-left border-collapse">
      <thead><tr className="text-xs uppercase tracking-wider text-[#6B6466] border-b border-[#EADFD3]"><th className="py-3 pr-4">Learner</th><th className="py-3 px-2">Assigned</th><th className="py-3 px-2">Lesson saves</th><th className="py-3 px-2">Quizzes passed</th><th className="py-3 px-2">Projects submitted</th><th className="py-3 px-2">Most recent saved record</th><th className="py-3 pl-2">Reviewer</th></tr></thead>
      <tbody>{summary.rows.map(m=><tr key={m.id} className="border-b border-[#F0E9E1] last:border-none">
       <td className="py-4 pr-4"><p className="font-black">{m.full_name||m.email}</p><p className="text-xs text-[#6B6466]">{m.email}</p></td>
       <td className="py-4 px-2 font-semibold">{m.assigned}</td>
       <td className="py-4 px-2">{m.stageCount}</td>
       <td className="py-4 px-2">{m.passed}</td>
       <td className="py-4 px-2">{m.submitted}</td>
       <td className="py-4 px-2">{m.recentSave?<><p className="font-bold">{formatTime(m.recentSave.time)}</p><p className="text-xs text-[#6B6466]">{m.recentSave.type} · persisted</p></>:<span className="text-[#8B572B]">No recorded activity</span>}</td>
       <td className="py-4 pl-2">{m.reviewers.length?<span className="font-semibold text-[#00753E]">{m.reviewers.map(x=>x.full_name||x.email).join(", ")}</span>:<span className="font-bold text-[#9B1D20]">Not assigned</span>}</td>
      </tr>)}</tbody>
     </table>
     {summary.rows.length===0&&<p className="py-5 text-sm text-[#6B6466]">No active learners currently have published modules assigned.</p>}
    </section>

    <div className="grid lg:grid-cols-2 gap-4">
     <section className={card}>
      <div className="flex flex-wrap justify-between gap-2 items-start"><div><h2 className="text-xl font-black">Review queue</h2><p className="text-sm text-[#6B6466] mt-1">Oldest pending work first</p></div><span className="text-sm font-black text-[#A55F12]">{summary.pending.length} waiting</span></div>
      <div className="mt-4 space-y-3">
       {summary.pending.length===0?<p className="text-sm p-4 rounded-xl bg-[#F4F1EE] text-[#6B6466]">No assignments currently await review.</p>:summary.pending.slice(0,16).map(s=>{
        const learner=summary.membersById.get(s.learner_id);
        const reviewer=summary.rows.find(m=>m.id===s.learner_id)?.reviewers||[];
        const course=summary.coursesById.get(s.module_id);
        return <article key={s.id} className="rounded-xl border border-[#EADFD3] bg-[#FFFBF6] p-4">
         <p className="font-extrabold">{learner?.full_name||learner?.email||"Learner"} · {course?.title||"Assigned module"}</p>
         <p className="text-xs text-[#6B6466] mt-1">Submitted {formatTime(s.submitted_at)}</p>
         <p className={"mt-2 text-sm font-semibold "+(reviewer.length?"text-[#00753E]":"text-[#9B1D20]")}>{reviewer.length?"Reviewer: "+reviewer.map(x=>x.full_name||x.email).join(", "):"No designated reviewer found"}</p>
        </article>;
       })}
       {summary.pending.length>16&&<p className="text-sm text-[#6B6466]">Showing the 16 oldest pending assignments.</p>}
      </div>
      <Link href="/aspectus" className="inline-block mt-5 font-extrabold text-[#A55F12] underline">Open the Hub's review workspace</Link>
     </section>
     <section className={card}>
      <h2 className="text-xl font-black">Reviewer permissions</h2>
      <p className="text-sm text-[#6B6466] mt-2">Assigned learner visibility is separate from a person's own coursework.</p>
      <div className="mt-4 space-y-3">
       {summary.reviewers.map(reviewer=>{
        const covered=summary.rows.filter(l=>l.reviewers.some(r=>r.id===reviewer.id));
        return <div key={reviewer.id} className="rounded-xl border border-[#EADFD3] bg-[#FFFBF6] p-4">
         <p className="font-black">{reviewer.full_name||reviewer.email}</p>
         <p className="text-xs text-[#6B6466]">{reviewer.email}</p>
         <p className="mt-2 text-sm font-semibold">{covered.length} assigned learner{covered.length===1?"":"s"}</p>
         <p className="text-xs text-[#6B6466] mt-1">{covered.length?covered.map(x=>x.full_name||x.email).join(", "):"No active, assigned learners linked"}</p>
        </div>;
       })}
       {summary.reviewers.length===0&&<p className="text-sm bg-[#F4F1EE] p-4 rounded-xl">No active reviewers are configured.</p>}
      </div>
     </section>
    </div>

    <section className={card}>
     <div className="flex flex-wrap gap-2 justify-between items-start">
      <div><h2 className="text-xl font-black">Reported saving errors</h2><p className="text-sm text-[#6B6466] mt-2">Last 7 days · Error codes only, never learner answers or reviewer feedback</p></div>
      <span className="rounded-full bg-[#F4F1EE] px-3 py-2 text-xs font-extrabold">{data.errorCount} captured</span>
     </div>
     {data.errors.length===0?<div className="mt-4 rounded-xl bg-[#F4F1EE] p-4 text-sm text-[#6B6466]">No errors captured since monitoring started. This is not proof that every save succeeded: offline failures and older incidents may not appear.</div>:
      <div className="mt-4 space-y-2">{data.errors.map(event=>{
       const who=summary.membersById.get(event.actor_id);
       const course=event.module_id?summary.coursesById.get(event.module_id):null;
       return <div key={event.id} className="flex flex-wrap justify-between gap-3 rounded-xl border border-[#EADFD3] p-4">
        <div><p className="font-bold">{operationName[event.operation]||event.operation} · {event.error_code}</p>
         <p className="text-sm text-[#6B6466] mt-1">{who?.full_name||who?.email||"Team member"}{course?" · "+course.title:""}</p></div>
        <p className="text-sm text-[#6B6466]">{formatTime(event.occurred_at)}</p>
       </div>;
      })}{data.errorCount>data.errors.length&&<p className="text-sm text-[#6B6466]">Showing the 100 most recent reported errors.</p>}</div>}
     <p className="text-xs text-[#6B6466] mt-5">The monitor captures errors returned by lesson, quiz, assignment and reviewer save operations when the app can report them. It does not monitor every browser event or retroactively identify past unsaved drafts.</p>
    </section>
   </>}
  </div>
 </main>;
}
