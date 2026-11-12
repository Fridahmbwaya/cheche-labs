"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";

const db=createClient();
type Member={id:string;email:string;full_name:string|null;role:string;role_title:string|null;department:string|null};
type Course={id:string;title:string;order_index:number;description:string|null;track_id:string|null;is_active:boolean;slug:string|null};
type Track={id:string;slug:string;title:string;summary:string|null;sort_order:number};
type Invite={email:string;full_name:string;role:string};
type Assignment={learner_id:string;module_id:string};
type PendingAssignment={email:string;module_id:string};
type ReviewerAssignment={reviewer_id:string;learner_id:string};
type PendingReviewee={email:string;learner_id:string};

export default function AspectusPeopleAdmin(){
 const [authorized,setAuthorized]=useState<boolean|null>(null);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [orgId,setOrgId]=useState("");
 const [members,setMembers]=useState<Member[]>([]);
 const [courses,setCourses]=useState<Course[]>([]);
 const [tracks,setTracks]=useState<Track[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [invites,setInvites]=useState<Invite[]>([]);
 const [pending,setPending]=useState<PendingAssignment[]>([]);
 const [reviewerAssignments,setReviewerAssignments]=useState<ReviewerAssignment[]>([]);
 const [pendingReviewees,setPendingReviewees]=useState<PendingReviewee[]>([]);
 const [revieweeIds,setRevieweeIds]=useState<string[]>([]);
 const [inviteReviewees,setInviteReviewees]=useState<string[]>([]);
 const [mode,setMode]=useState<"people"|"invite">("people");
 const [selectedId,setSelectedId]=useState("");
 const [selectedEmail,setSelectedEmail]=useState("");
 const [checked,setChecked]=useState<string[]>([]);
 const [inviteEmail,setInviteEmail]=useState("");
 const [inviteName,setInviteName]=useState("");
 const [inviteRole,setInviteRole]=useState("employee");
 const [inviteModules,setInviteModules]=useState<string[]>([]);
 const [filter,setFilter]=useState("");

 async function loadData(id:string){
  const [us,ms,as,iv,pa,ra,pr,tr]=await Promise.all([
   db.from("users").select("id,email,full_name,role,role_title,department").eq("org_id",id).order("full_name"),
   db.from("modules").select("id,title,order_index,description,track_id,is_active,slug").eq("org_id",id).order("order_index"),
   db.from("aspectus_module_assignments").select("learner_id,module_id").eq("org_id",id),
   db.from("aspectus_pending_accounts").select("email,full_name,role").eq("org_id",id).order("full_name"),
   db.from("aspectus_pending_module_assignments").select("email,module_id").eq("org_id",id),
   db.from("aspectus_reviewer_assignments").select("reviewer_id,learner_id").eq("org_id",id),
   db.from("aspectus_pending_reviewer_assignments").select("email,learner_id").eq("org_id",id),
   db.from("learning_tracks").select("id,slug,title,summary,sort_order").eq("org_id",id).order("sort_order")
  ]);
  const errors=[us.error,ms.error,as.error,iv.error,pa.error,ra.error,pr.error,tr.error].filter(Boolean);
  if(errors.length)throw new Error(errors.map(x=>x?.message).join("; "));
  setMembers(us.data||[]);setCourses(ms.data||[]);setAssignments(as.data||[]);
  setInvites(iv.data||[]);setPending(pa.data||[]);
  setReviewerAssignments(ra.data||[]);setPendingReviewees(pr.data||[]);setTracks(tr.data||[]);
 }
 useEffect(()=>{
  let alive=true;
  (async()=>{
   try{
    const {data:{user}}=await db.auth.getUser();
    if(!user){window.location.replace("/preview/aspectus-welcome.html");return}
    const {data:profile,error}=await db.from("users").select("org_id").eq("id",user.id).single();
    if(error||!profile)throw new Error("Your Aspectus account was not found.");
    const {data:allowed,error:accessError}=await db.rpc("aspectus_can_admin",{p_org_id:profile.org_id});
    if(accessError)throw accessError;
    if(!alive)return;
    setAuthorized(!!allowed);setOrgId(profile.org_id);
    if(allowed)await loadData(profile.org_id);
   }catch(err){if(alive){setMessage(err instanceof Error?err.message:String(err));setAuthorized(false)}}
  })();
  return()=>{alive=false};
 },[]);
 const focused=members.find(m=>m.id===selectedId);
 const focusedInvite=invites.find(i=>i.email===selectedEmail);
 const visible=useMemo(()=>members.filter(m=>(m.full_name||m.email).toLowerCase().includes(filter.toLowerCase())||m.email.toLowerCase().includes(filter.toLowerCase())),[members,filter]);
 const assignedTo=members.filter(m=>assignments.some(a=>a.learner_id===m.id)).length;
 const publishedCourses=courses.filter(m=>m.is_active);
 const draftCourses=courses.filter(m=>!m.is_active);
 const availableLearners=members.filter(m=>m.role==="employee");
 const selectedRole=focused?.role||focusedInvite?.role;
 function pickMember(m:Member){
  setSelectedId(m.id);setSelectedEmail("");
  setChecked(assignments.filter(a=>a.learner_id===m.id).map(a=>a.module_id));
  setRevieweeIds(reviewerAssignments.filter(a=>a.reviewer_id===m.id).map(a=>a.learner_id));
  setMessage("");
 }
 function pickInvite(m:Invite){
  setSelectedEmail(m.email);setSelectedId("");
  setChecked(pending.filter(a=>a.email===m.email).map(a=>a.module_id));
  setRevieweeIds(pendingReviewees.filter(a=>a.email===m.email).map(a=>a.learner_id));
  setMessage("");
 }
 function toggle(list:string[],id:string, setter:(ids:string[])=>void){setter(list.includes(id)?list.filter(v=>v!==id):[...list,id])}
 async function saveAssignments(){
  if(!orgId||(!selectedId&&!selectedEmail))return;
  setBusy(true);setMessage("");
  try{
   if(selectedId){
    const {error}=await db.rpc("aspectus_set_member_modules",{p_member_id:selectedId,p_module_ids:checked});
    if(error)throw error;
    if(focused?.role==="manager"||focused?.role==="hr_manager"){
     const {error:reviewError}=await db.rpc("aspectus_set_reviewer_learners",{p_reviewer_id:selectedId,p_learner_ids:revieweeIds});
     if(reviewError)throw reviewError;
    }
   }else if(focusedInvite){
    const {error}=await db.rpc("aspectus_invite_member",{p_email:focusedInvite.email,p_full_name:focusedInvite.full_name,p_role:focusedInvite.role,p_module_ids:checked});
    if(error)throw error;
    if(focusedInvite.role==="manager"){
     const {error:reviewError}=await db.rpc("aspectus_set_pending_reviewees",{p_email:focusedInvite.email,p_learner_ids:revieweeIds});
     if(reviewError)throw reviewError;
    }
   }
   await loadData(orgId);
   setMessage("Learning access and reviewer assignments saved. Changes will appear on the next refresh.");
  }catch(err){setMessage("Could not save assignments: "+(err instanceof Error?err.message:String(err)))}
  finally{setBusy(false)}
 }
 async function createInvite(e:React.FormEvent){
  e.preventDefault();if(!orgId)return;
  setBusy(true);setMessage("");
  try{
   const email=inviteEmail.trim().toLowerCase();
   const {error}=await db.rpc("aspectus_invite_member",{p_email:email,p_full_name:inviteName.trim(),p_role:inviteRole,p_module_ids:inviteModules});
   if(error)throw error;
   if(inviteRole==="manager"){
    const {error:reviewError}=await db.rpc("aspectus_set_pending_reviewees",{p_email:email,p_learner_ids:inviteReviewees});
    if(reviewError)throw reviewError;
   }
   await loadData(orgId);
   setMode("people");setSelectedId("");setSelectedEmail(email);setChecked(inviteModules);setRevieweeIds(inviteRole==="manager"?inviteReviewees:[]);
   const {data:delivery,error:deliveryError}=await db.functions.invoke("aspectus-send-invitation",{body:{email}});
   if(deliveryError||!delivery?.accepted){
    let reason=deliveryError?.message||"Email delivery service did not confirm the request.";
    const context=(deliveryError as {context?:Response}|null)?.context;
    if(context&&typeof context.json==="function"){
     const response=await context.json().catch(()=>null);
     if(response?.error)reason=response.error;
    }
    setMessage("Account prepared for "+email+", but the invitation email could not be sent: "+reason+". You can copy the link below while email delivery is resolved.");
   }else{
    setMessage("Invitation email requested for "+email+". The account will remain under Invited · waiting for first sign-in until the person joins.");
   }
  }catch(err){setMessage("Could not create invitation: "+(err instanceof Error?err.message:String(err)))}
  finally{setBusy(false)}
 }
 const joinText=()=>"You've been invited to create an account on the Aspectus Learning Hub.\n\n"+window.location.origin+"/preview/aspectus-welcome.html";
 function copyInvite(email:string){
  void navigator.clipboard.writeText(joinText()).then(()=>setMessage("Account link copied for "+email)).catch(()=>setMessage("Copy failed. Share the Learning Hub welcome link and the person's registered email address."));
 }
 const selectedLabel=focused?.full_name||focusedInvite?.full_name||"Selected person";
 const selection=selectedId||selectedEmail;
 return <main className="min-h-screen bg-[#FFFBF6] text-[#373435] p-5 sm:p-9">
  <div className="max-w-6xl mx-auto space-y-6">
   <header className="rounded-[30px] border border-[#EADFD3] bg-white shadow-sm overflow-hidden">
    <div className="h-2 bg-[#FAA954]"/>
    <div className="p-6 sm:p-9 flex flex-wrap items-center justify-between gap-5">
     <div><p className="text-sm font-extrabold tracking-[.17em] text-[#A55F12] uppercase">Aspectus Learning Hub · Administration</p><h1 className="text-3xl sm:text-4xl font-black mt-2">People & learning access</h1><p className="text-base text-[#6B6466] mt-2">Give everyone their own account, learning journey and permissions.</p></div>
     <a href="/aspectus" className="rounded-xl border border-[#EADFD3] px-5 py-3 font-extrabold hover:bg-[#FEEBD5]">← Back to Learning Hub</a>
    </div>
   </header>
   {message&&<p role="status" className="rounded-xl border-l-4 border-[#FAA954] bg-white p-4 shadow-sm">{message}</p>}
   {authorized===null&&<div className="rounded-2xl bg-white p-8">Checking your account permissions…</div>}
   {authorized===false&&<div className="rounded-2xl bg-white border border-[#EADFD3] p-8"><h2 className="text-xl font-extrabold">Account administrator access required</h2><p className="mt-2">Learning and team review remain available from your regular dashboard. Only designated administrators can create accounts and change module access.</p></div>}
   {authorized&&<>
    <section className="grid sm:grid-cols-3 gap-4">
     <div className="rounded-[22px] bg-[#373435] text-white p-5"><p className="text-sm text-white/75">Existing accounts</p><p className="text-3xl font-black mt-2">{members.length}</p></div>
     <div className="rounded-[22px] bg-[#D3F2E2] p-5"><p className="text-sm text-[#00753E]">Accounts with assignments</p><p className="text-3xl font-black mt-2 text-[#00753E]">{assignedTo}</p></div>
     <div className="rounded-[22px] bg-[#FEEBD5] p-5"><p className="text-sm text-[#A55F12]">Published learning modules</p><p className="text-3xl font-black mt-2">{publishedCourses.length}</p></div>
    </section>
    <div className="flex flex-wrap gap-3">
     <button type="button" onClick={()=>setMode("people")} className={mode==="people"?"rounded-xl bg-[#FAA954] px-5 py-3 font-extrabold":"rounded-xl bg-white border border-[#EADFD3] px-5 py-3 font-bold"}>Manage people</button>
     <button type="button" onClick={()=>setMode("invite")} className={mode==="invite"?"rounded-xl bg-[#FAA954] px-5 py-3 font-extrabold":"rounded-xl bg-white border border-[#EADFD3] px-5 py-3 font-bold"}>+ Add a person</button>
    </div>
    {mode==="invite"?<form onSubmit={e=>void createInvite(e)} className="rounded-[28px] border border-[#EADFD3] bg-white p-6 sm:p-8 space-y-5">
     <div><h2 className="text-2xl font-black">Add a new team member</h2><p className="text-[#6B6466] mt-2">Create their access, choose their role and select which modules they&apos;ll see. They sign in with their own email.</p></div>
     <div className="grid md:grid-cols-2 gap-4">
      <label className="block font-bold">Full name<input required minLength={2} value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="e.g. Sarah" className="block w-full border border-[#EADFD3] rounded-xl p-3 mt-2"/></label>
      <label className="block font-bold">Email address<input required type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="name@aspectus..." className="block w-full border border-[#EADFD3] rounded-xl p-3 mt-2"/></label>
     </div>
     <fieldset className="space-y-3">
      <legend className="text-lg font-extrabold">Step 1 · Choose what this person can do</legend>
      <p className="text-sm text-[#6B6466]">Account role controls permissions. Assigned modules are chosen separately in Step 2.</p>
      <div className="grid md:grid-cols-3 gap-3">{[
       {value:"employee",name:"Learner",description:"Takes assigned lessons, quizzes and practical assignments. Sees only their own progress and feedback.",access:"Cannot review others or manage accounts."},
       {value:"manager",name:"Reviewer",description:"Reviews submissions, approves work and requests revisions. May also take assigned learning modules.",access:"Only sees learners explicitly assigned to this reviewer. Reviewer assignments are selected in Step 3."},
       {value:"org_admin",name:"Super Admin",description:"Manages accounts, modules and team progress, including review oversight.",access:"Full administration access — assign only to a trusted administrator."}
      ].map(option=><label key={option.value} className={"cursor-pointer block rounded-2xl border-2 p-4 "+(inviteRole===option.value?"border-[#FAA954] bg-[#FFF4E6]":"border-[#EADFD3] bg-white")}>
       <span className="flex items-center gap-2"><input type="radio" name="inviteRole" value={option.value} checked={inviteRole===option.value} onChange={()=>setInviteRole(option.value)} className="h-5 w-5 accent-[#FAA954]"/><strong className="text-lg">{option.name}</strong></span>
       <span className="block text-sm mt-3 text-[#373435]">{option.description}</span>
       <span className="block text-xs mt-2 text-[#6B6466]">{option.access}</span>
      </label>)}</div>
     </fieldset>
     <div className="rounded-2xl bg-[#FFFBF6] border border-[#EADFD3] p-5">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-extrabold">Step 2 · Assign learning modules</h3><p className="text-sm text-[#6B6466]">Choose what this person will study, regardless of account role. Reviewers do not need modules to review work.</p></div><div className="flex gap-3"><button type="button" className="font-bold text-sm underline" onClick={()=>setInviteModules(publishedCourses.map(m=>m.id))}>All</button><button type="button" className="font-bold text-sm underline" onClick={()=>setInviteModules([])}>None</button></div></div>
      <div className="grid md:grid-cols-2 gap-3 mt-4">{publishedCourses.map(m=><label key={m.id} className="flex gap-3 items-start bg-white border border-[#EADFD3] rounded-xl p-3 cursor-pointer"><input type="checkbox" checked={inviteModules.includes(m.id)} onChange={()=>toggle(inviteModules,m.id,setInviteModules)} className="mt-1 accent-[#00A859] w-5 h-5"/><span><strong className="block">{m.title}</strong><span className="text-xs text-[#6B6466]">Module {m.order_index.toString().padStart(2,"0")}</span></span></label>)}</div>
     </div>
     {inviteRole==="manager"&&<section className="rounded-2xl border border-[#EADFD3] bg-[#FFFBF6] p-5 space-y-3">
      <h3 className="font-extrabold">Step 3 · Which learners can this reviewer assess?</h3>
      <p className="text-sm text-[#6B6466]">Only the people selected here appear in this reviewer&apos;s progress and submission queue. Learners can have more than one reviewer.</p>
      {availableLearners.length===0?<p className="text-sm">No active learners yet. You can assign learners after they create accounts.</p>:
      <div className="grid md:grid-cols-2 gap-2">{availableLearners.map(person=><label key={person.id} className="flex gap-3 items-center rounded-xl border border-[#EADFD3] p-3 bg-white cursor-pointer"><input type="checkbox" className="h-5 w-5 accent-[#00A859]" checked={inviteReviewees.includes(person.id)} onChange={()=>toggle(inviteReviewees,person.id,setInviteReviewees)}/><span><strong className="block">{person.full_name||person.email}</strong><span className="text-xs text-[#6B6466]">{person.email}</span></span></label>)}</div>}
     </section>}
     <button disabled={busy} type="submit" className="rounded-xl px-7 py-4 bg-[#FAA954] font-extrabold disabled:opacity-50">{busy?"Preparing invitation…":"Create account & send invitation"} →</button>
     <p className="text-sm text-[#6B6466]">The account is reserved first, then a secure invitation email is requested automatically. The person&apos;s account activates when they follow the emailed link.</p>
    </form>:<div className="grid lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-5">
     <section className="rounded-[28px] bg-white border border-[#EADFD3] p-5 sm:p-6">
      <h2 className="text-xl font-black">Your people</h2><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search name or email" aria-label="Search accounts" className="w-full rounded-xl border border-[#EADFD3] p-3 mt-4"/>
      <p className="text-sm text-[#6B6466] mt-5 mb-2 font-bold uppercase tracking-widest">Active accounts</p>
      <div className="space-y-2">{visible.map(m=><button key={m.id} type="button" onClick={()=>pickMember(m)} className={"w-full text-left border rounded-xl p-4 hover:border-[#FAA954] "+(selectedId===m.id?"border-[#FAA954] bg-[#FEEBD5]":"border-[#EADFD3]")}><strong className="block">{m.full_name||m.email}</strong><span className="block text-sm text-[#6B6466] mt-1">{m.email}</span><span className="inline-block mt-2 text-xs font-extrabold uppercase text-[#A55F12]">{m.role==="org_admin"?"Super Admin":m.role==="manager"||m.role==="hr_manager"?"Reviewer":"Learner"}</span></button>)}</div>
      <p className="text-sm text-[#6B6466] mt-6 mb-2 font-bold uppercase tracking-widest">Invited · waiting for first sign-in</p>
      <div className="space-y-2">{invites.filter(i=>!members.some(m=>m.email.toLowerCase()===i.email.toLowerCase())).map(i=><button type="button" key={i.email} onClick={()=>pickInvite(i)} className={"w-full text-left border rounded-xl p-4 "+(selectedEmail===i.email?"border-[#FAA954] bg-[#FEEBD5]":"border-[#EADFD3]")}><strong className="block">{i.full_name}</strong><span className="block text-sm text-[#6B6466]">{i.email}</span><span className="text-xs text-[#A55F12] font-extrabold">PENDING · {i.role==="org_admin"?"Super Admin":i.role==="manager"?"Reviewer":"Learner"}</span></button>)}</div>
     </section>
     <section className="rounded-[28px] bg-white border border-[#EADFD3] p-5 sm:p-7">
      {!selection?<div className="py-16 text-center"><p className="text-3xl">📚</p><h3 className="text-xl font-black mt-3">Choose a person</h3><p className="mt-2 text-[#6B6466]">Select an existing account or pending invitation to manage their learning access.</p></div>:<>
       <div className="flex flex-wrap justify-between gap-4 items-start"><div><p className="text-xs font-extrabold uppercase tracking-widest text-[#A55F12]">Account permissions & learning</p><h3 className="text-2xl font-black mt-2">{selectedLabel}</h3><p className="text-sm text-[#6B6466] mt-1">{focused?.email||focusedInvite?.email}</p></div><span className="rounded-full px-4 py-2 text-xs bg-[#D3F2E2] font-extrabold text-[#00753E]">{checked.length} of {publishedCourses.length} assigned</span></div>
       <div className="mt-4 p-4 rounded-xl bg-[#FFFBF6] border border-[#EADFD3]"><p className="text-sm font-bold">Role: {((focused?.role||focusedInvite?.role)==="org_admin")?"Super Admin":((focused?.role||focusedInvite?.role)==="manager"||(focused?.role||focusedInvite?.role)==="hr_manager")?"Reviewer":"Learner"}</p><p className="text-xs text-[#6B6466] mt-1">The account role controls permissions. This section changes assigned learning modules only; it does not change the person&apos;s role.</p></div>
       {(selectedRole==="manager"||selectedRole==="hr_manager")&&<section className="mt-6 rounded-2xl bg-[#FFFBF6] border border-[#EADFD3] p-4 space-y-3">
        <h4 className="font-extrabold">Learners this reviewer can assess</h4>
        <p className="text-sm text-[#6B6466]">Review access is independent of learning modules. Selected learners appear in the reviewer&apos;s dashboard; everyone else stays private.</p>
        <div className="space-y-2">{availableLearners.map(person=><label key={person.id} className="flex items-center gap-3 rounded-xl bg-white border border-[#EADFD3] p-3 cursor-pointer"><input type="checkbox" className="h-5 w-5 accent-[#00A859]" checked={revieweeIds.includes(person.id)} onChange={()=>toggle(revieweeIds,person.id,setRevieweeIds)}/><span><strong className="block">{person.full_name||person.email}</strong><span className="text-xs text-[#6B6466]">{person.email}</span></span></label>)}</div>
       </section>}
       <div className="mt-6 flex gap-3"><button type="button" className="text-sm font-extrabold underline" onClick={()=>setChecked(publishedCourses.map(m=>m.id))}>Select all</button><button type="button" className="text-sm font-extrabold underline" onClick={()=>setChecked([])}>Clear</button></div>
       <div className="space-y-3 mt-4">{publishedCourses.map(m=><label key={m.id} className={"flex gap-3 rounded-xl border p-4 cursor-pointer "+(checked.includes(m.id)?"bg-[#F3FFF8] border-[#9ADAB9]":"bg-[#FFFBF6] border-[#EADFD3]")}><input type="checkbox" className="mt-1 accent-[#00A859] w-5 h-5" checked={checked.includes(m.id)} onChange={()=>toggle(checked,m.id,setChecked)}/><span><strong>{m.title}</strong><span className="text-sm block text-[#6B6466] mt-1">Module {m.order_index.toString().padStart(2,"0")}</span></span></label>)}</div>
       <div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" disabled={busy} onClick={()=>void saveAssignments()} className="bg-[#FAA954] rounded-xl px-6 py-3 font-extrabold disabled:opacity-50">{busy?"Saving…":"Save learning & review access"}</button>{focusedInvite&&<button type="button" onClick={()=>copyInvite(focusedInvite.email)} className="rounded-xl border px-5 py-3 font-extrabold">Copy account link</button>}</div>
       <p className="mt-4 text-sm text-[#6B6466]">Changes affect only this person&apos;s learning library, not anyone else&apos;s scores, submissions or reviews.</p>
      </>}
     </section>
    </div>}
    <section className="rounded-[26px] bg-white border border-[#EADFD3] p-6 sm:p-8 space-y-5">
      <div><p className="text-xs font-extrabold tracking-[.17em] uppercase text-[#A55F12]">Learning track library</p><h2 className="text-2xl font-black mt-2">Organize learning by capability</h2><p className="text-[#6B6466] mt-2">Published courses can be assigned to staff. Drafts stay private until the content and assessments are ready.</p></div>
      <div className="grid md:grid-cols-2 gap-4">{tracks.map(track=>{
       const trackCourses=courses.filter(m=>m.track_id===track.id);
       return <article key={track.id} className="rounded-[22px] border border-[#EADFD3] bg-[#FFFBF6] p-5">
        <p className="font-extrabold text-lg">{track.title}</p><p className="text-sm text-[#6B6466] mt-2">{track.summary}</p>
        <div className="flex gap-2 mt-4"><span className="rounded-full bg-[#D3F2E2] text-[#00753E] text-xs px-3 py-1 font-extrabold">{trackCourses.filter(m=>m.is_active).length} published</span><span className="rounded-full bg-[#FEEBD5] text-[#945D21] text-xs px-3 py-1 font-extrabold">{trackCourses.filter(m=>!m.is_active).length} drafts</span></div>
        <div className="space-y-3 mt-4">{trackCourses.map(m=><div key={m.id} className="rounded-xl bg-white border border-[#EADFD3] p-4">
         <p className="font-bold">{m.title}</p><p className="text-xs text-[#6B6466] mt-1">{m.is_active?"Published · assignable":"Draft · not yet assignable"}</p>
         {!m.is_active&&m.slug==="clear-workplace-communication"&&<a className="inline-block mt-3 underline text-[#A55F12] font-extrabold text-sm" href="/aspectus/skills/clear-workplace-communication">Preview the baseline and Lesson 1 →</a>}
         {!m.is_active&&m.slug==="teamwork-and-collaboration"&&<a className="inline-block mt-3 underline text-[#A55F12] font-extrabold text-sm" href="/aspectus/skills/teamwork-and-collaboration">Open the Teamwork &amp; Collaboration prototype →</a>}
        </div>)}</div>
       </article>;
      })}</div>
      {draftCourses.length>0&&<p className="text-sm text-[#6B6466]">Draft lessons are not assigned automatically. You can preview them as an administrator before publishing to staff.</p>}
    </section>
    <aside className="rounded-[24px] p-6 bg-[#373435] text-white"><p className="text-sm font-extrabold tracking-widest text-[#FAA954]">CHECHE PROFESSIONAL SKILLS</p><h3 className="text-2xl font-black mt-2">Skills the whole team can practise.</h3><p className="mt-2 text-white/80">Clear Workplace Communication and Teamwork &amp; Collaboration now have interactive draft previews. Each course uses the same account and progress foundation, with exercises adaptable to sales, technical, finance, field and leadership work.</p></aside>
   </>}
  </div>
 </main>
}