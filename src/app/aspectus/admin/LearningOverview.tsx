/* eslint-disable react/no-unescaped-entities */
"use client";

type Course = { id:string;title:string;order_index:number;track_id:string|null;is_active:boolean;slug:string|null };
type Track = {id:string;slug:string;title:string;summary:string|null;sort_order:number};
type Person = {id:string;email:string;full_name:string|null;role:string;work_email:string|null};
type Invite = {email:string;full_name:string;role:string;work_email:string|null};
type Assignment = {learner_id:string;module_id:string};
type PendingAssignment = {email:string;module_id:string};

type Props={
 view:"team"|"mine";currentUserId:string;
 courses:Course[];tracks:Track[];members:Person[];invites:Invite[];
 assignments:Assignment[];pending:PendingAssignment[];
 onManageMember:(id:string)=>void;onManageInvite:(email:string)=>void;
};
const roleLabel=(role:string)=>role==="org_admin"?"Super Admin":role==="manager"||role==="hr_manager"?"Reviewer":"Learner";
const pill="inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold";
const card="rounded-[26px] border border-[#EADFD3] bg-white overflow-hidden";

export default function LearningOverview(p:Props){
 const current=p.members.find(m=>m.id===p.currentUserId);
 const published=p.courses.filter(c=>c.is_active);
 const drafts=p.courses.filter(c=>!c.is_active);
 const ownModules=published.filter(c=>p.assignments.some(a=>a.learner_id===p.currentUserId&&a.module_id===c.id));
 const professionalDrafts=drafts.filter(c=>p.tracks.some(t=>t.slug==="professional-skills"&&t.id===c.track_id));
 const people=[
  ...p.members.filter(m=>m.id!==p.currentUserId).map(m=>({
   key:"member:"+m.id,id:m.id,email:m.email,name:m.full_name||m.email,role:m.role,invited:false,
   courseIds:p.assignments.filter(a=>a.learner_id===m.id).map(a=>a.module_id)
  })),
  ...p.invites.filter(i=>!p.members.some(m=>m.email.toLowerCase()===i.email.toLowerCase()))
   .map(i=>({
    key:"invite:"+i.email,id:"",email:i.email,name:i.full_name,role:i.role,invited:true,
    courseIds:p.pending.filter(a=>a.email.toLowerCase()===i.email.toLowerCase()).map(a=>a.module_id)
   }))
 ];
 const grouped=(courses:Course[])=>p.tracks.map(t=>({...t,items:courses.filter(c=>c.track_id===t.id)})).filter(t=>t.items.length);
 const fallback=(courses:Course[])=>courses.filter(c=>!p.tracks.some(t=>t.id===c.track_id));

 if(p.view==="mine")return <section className="space-y-5">
  <header className={card+" p-6 sm:p-8"}>
   <p className="text-xs font-black uppercase tracking-[.16em] text-[#A55F12]">My learning / Separate from team oversight</p>
   <h2 className="text-2xl sm:text-3xl font-black mt-3">{current?.full_name?.split(" ")[0]||"Your"} learning space</h2>
   <p className="mt-3 text-[#6B6466] max-w-3xl">Your own learning and the courses you supervise are different. Being a Super Admin lets you oversee everyone and preview draft content; it does not automatically enroll you in a colleague&apos;s modules.</p>
   <a className="inline-block mt-5 rounded-xl bg-[#FAA954] px-5 py-3.5 font-extrabold hover:brightness-95" href="/aspectus/preview">Explore Ian's eight onboarding modules in any order →</a>
   <div className="flex flex-wrap gap-2 mt-5">
    <span className={pill+" bg-[#D3F2E2] text-[#006B3B]"}>{ownModules.length} published modules assigned to you</span>
    <span className={pill+" bg-[#FEEBD5] text-[#8B572B]"}>{professionalDrafts.length} Professional Skills previews</span>
   </div>
  </header>
  <div className="grid lg:grid-cols-2 gap-4">
   <article className={card+" p-6 sm:p-7"}>
    <p className="text-xs uppercase tracking-widest font-black text-[#00753E]">Your personal assignments</p>
    <h3 className="text-xl font-black mt-2">Courses to complete</h3>
    {ownModules.length===0?<p className="mt-4 p-4 rounded-xl bg-[#F4F1EE] text-sm text-[#6B6466]">No published modules have been assigned to your personal learning plan. This does not change your administrative permissions.</p>:
     <div className="mt-5 space-y-5">{grouped(ownModules).map(t=><div key={t.id}>
      <h4 className="text-sm font-black tracking-wide uppercase text-[#A55F12]">{t.title}</h4>
      <ul className="mt-2 space-y-2">{t.items.map(c=><li key={c.id} className="rounded-xl bg-[#F8F6F3] p-3 text-sm font-semibold">{c.title}</li>)}</ul>
     </div>)}{fallback(ownModules).map(c=><p key={c.id} className="p-3 bg-[#F8F6F3] rounded-xl text-sm">{c.title}</p>)}</div>}
    <button type="button" className="mt-5 rounded-xl border border-[#EADFD3] bg-white px-4 py-3 text-sm font-extrabold hover:border-[#FAA954]" disabled={!current} onClick={()=>current&&p.onManageMember(current.id)}>Manage my assignments →</button>
   </article>
   <article className={card+" p-6 sm:p-7 bg-[#FFFBF6]"}>
    <p className="text-xs uppercase tracking-widest font-black text-[#A55F12]">Professional Skills / Draft previews</p>
    <h3 className="text-xl font-black mt-2">Explore courses in development</h3>
    <p className="mt-3 text-sm text-[#6B6466]">These are not yet published or assigned to the team. You can open them as a Super Admin to evaluate the content.</p>
    <div className="mt-5 space-y-3">{professionalDrafts.length===0?<p className="text-sm p-4 rounded-xl bg-white">No Professional Skills prototypes are available yet.</p>:professionalDrafts.map(m=><div key={m.id} className="rounded-xl border border-[#EADFD3] bg-white p-4">
     <h4 className="font-black">{m.title}</h4>
     <p className="text-xs text-[#6B6466] mt-1">Draft · Admin preview only</p>
     {m.slug==="clear-workplace-communication"&&<a href="/aspectus/skills/clear-workplace-communication" className="inline-block mt-3 font-extrabold text-sm text-[#A55F12] underline">Preview course →</a>}
     {m.slug==="teamwork-and-collaboration"&&<a href="/aspectus/skills/teamwork-and-collaboration" className="inline-block mt-3 font-extrabold text-sm text-[#A55F12] underline">Preview course →</a>}
    </div>)}</div>
   </article>
  </div>
 </section>;

 return <section className="space-y-5">
  <header className={card+" p-6 sm:p-8"}>
   <p className="text-xs font-black uppercase tracking-[.16em] text-[#A55F12]">Team learning access / Company-wide</p>
   <h2 className="text-2xl sm:text-3xl font-black mt-3">Who can access which modules?</h2>
   <p className="mt-3 max-w-3xl text-[#6B6466]">These are the actual assignments for each person, grouped by learning track—not a list of all courses in the catalog. Draft prototypes and your own personal learning are displayed separately.</p>
   <div className="flex flex-wrap gap-2 mt-5">
    <span className={pill+" bg-[#D3F2E2] text-[#00753E]"}>{p.members.length} active team accounts</span>
    <span className={pill+" bg-[#FEEBD5] text-[#8B572B]"}>{people.filter(x=>x.invited).length} pending invitations</span>
    <span className={pill+" bg-[#F4F1EE] text-[#736961]"}>{drafts.length} draft courses excluded</span>
   </div>
  </header>
  {people.length===0?<div className={card+" p-7"}><p>No other accounts yet. You can invite colleagues and assign courses as they join.</p></div>:
  <div className="grid lg:grid-cols-2 gap-4">{people.map(person=>{
   const assigned=published.filter(c=>person.courseIds.includes(c.id));
   const orphanDrafts=drafts.filter(c=>person.courseIds.includes(c.id));
   const tracks=grouped(assigned);
   const extra=fallback(assigned);
   return <article key={person.key} className={card}>
    <header className="border-b border-[#EADFD3] bg-[#FFFBF6] p-5 sm:p-6">
     <div className="flex items-start justify-between gap-3 flex-wrap">
      <div><h3 className="text-xl font-black">{person.name}</h3><p className="text-xs text-[#6B6466] mt-1">{person.email}</p></div>
      <span className={pill+" bg-[#FEEBD5] text-[#8B572B]"}>{roleLabel(person.role)}{person.invited?" · Pending":""}</span>
     </div>
     <p className="mt-4 text-sm font-bold">{assigned.length} published module{assigned.length===1?"":"s"} assigned</p>
    </header>
    <div className="p-5 sm:p-6 space-y-4">
     {assigned.length===0&&<p className="rounded-xl bg-[#F4F1EE] p-4 text-sm text-[#6B6466]">No published modules assigned to this account.</p>}
     {tracks.map(t=><div key={t.id}>
      <div className="flex items-center justify-between gap-2">
       <h4 className="text-sm uppercase tracking-wide font-black text-[#A55F12]">{t.title}</h4>
       <span className="text-xs text-[#6B6466] font-bold">{t.items.length} assigned</span>
      </div>
      <ol className="space-y-2 mt-2">{t.items.map(m=><li key={m.id} className="flex items-start gap-3 rounded-xl bg-[#F8F6F3] p-3"><span className="shrink-0 text-xs font-black text-[#8B572B]">{String(m.order_index).padStart(2,"0")}</span><span className="text-sm font-semibold">{m.title}</span></li>)}</ol>
     </div>)}
     {extra.length>0&&<div><p className="text-sm uppercase tracking-wide font-black text-[#A55F12]">Other assigned learning</p><ul className="space-y-2 mt-2">{extra.map(m=><li key={m.id} className="rounded-xl bg-[#F8F6F3] p-3 text-sm font-semibold">{m.title}</li>)}</ul></div>}
     {orphanDrafts.length>0&&<p className="rounded-lg bg-[#FFF2DF] p-3 text-xs text-[#8B572B]">Attention: {orphanDrafts.length} unpublished course assignment{orphanDrafts.length===1?"":"s"} on this account. They are not published for regular learners.</p>}
     {assigned.some(c=>p.tracks.some(t=>t.slug==="aspectus-onboarding"&&t.id===c.track_id))&&<a href="/aspectus/preview" className="block rounded-xl bg-[#FEEBD5] px-4 py-3 text-sm font-extrabold hover:bg-[#FAA954]">Preview this onboarding as a learner →</a>}
     <button type="button" onClick={()=>person.invited?p.onManageInvite(person.email):p.onManageMember(person.id)} className="rounded-xl border border-[#EADFD3] bg-white px-4 py-3 font-extrabold text-sm hover:border-[#FAA954]">View or change access →</button>
    </div>
   </article>;
  })}</div>}
 </section>;
}
