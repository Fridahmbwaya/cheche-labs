"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import {createClient} from "@/lib/supabase/client";

const db=createClient();
type PublishingDecision="not_reviewed"|"approved_to_publish"|"needs_changes"|"do_not_publish";
type Decision="approved"|"approved_with_changes"|"revision_requested";
type Draft={feedback:string;publishing_decision:PublishingDecision};
type SaveStatus="loading"|"clean"|"editing"|"saving"|"saved"|"recovered"|"error"|"submitted";
type Props={
 submissionId:string;
 orgId:string;
 reviewerId:string;
 onReviewed:()=>Promise<void>;
};
const empty:Draft={feedback:"",publishing_decision:"not_reviewed"};
const allowedPublishing=new Set<PublishingDecision>(["not_reviewed","approved_to_publish","needs_changes","do_not_publish"]);
const fieldClass="block w-full rounded-xl border border-[#EADFD3] bg-white p-3 text-base text-[#373435] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00A859]";
function parseBackup(key:string):Draft|null{
 try{
  const raw=window.localStorage.getItem(key);
  if(!raw)return null;
  const data=JSON.parse(raw);
  if(!data||typeof data.feedback!=="string"||!allowedPublishing.has(data.publishing_decision))return null;
  return {feedback:data.feedback,publishing_decision:data.publishing_decision};
 }catch{return null;}
}

export default function ReviewDraftForm({submissionId,orgId,reviewerId,onReviewed}:Props){
 const [draft,setDraft]=useState<Draft>(empty);
 const [ready,setReady]=useState(false);
 const [status,setStatus]=useState<SaveStatus>("loading");
 const [lastSaved,setLastSaved]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [revision,setRevision]=useState(0);
 const [reload,setReload]=useState(0);
 const [submitting,setSubmitting]=useState(false);
 const [submitted,setSubmitted]=useState(false);
 const current=useRef<Draft>(empty);
 const version=useRef(0);
 const persistedVersion=useRef(0);
 const queue=useRef<Promise<void>>(Promise.resolve());
 const submittingRef=useRef(false);
 const key="aspectus-review-draft-v1:"+reviewerId+":"+submissionId;

 useEffect(()=>{
  let active=true;
  setReady(false);
  setStatus("loading");
  setError("");
  async function load(){
   const backup=parseBackup(key);
   const {data,error:loadError}=await db.from("aspectus_review_drafts")
    .select("feedback,publishing_decision,updated_at")
    .eq("reviewer_id",reviewerId)
    .eq("submission_id",submissionId)
    .maybeSingle();
   if(!active)return;
   if(loadError){
    setError("Could not load the cloud draft: "+loadError.message+". Your browser recovery copy, if any, has not been cleared.");
    setStatus("error");
    return;
   }
   const serverDecision=allowedPublishing.has(data?.publishing_decision as PublishingDecision)
    ?data!.publishing_decision as PublishingDecision:"not_reviewed";
   const restored:Draft=backup||{feedback:data?.feedback||"",publishing_decision:serverDecision};
   current.current=restored;
   setDraft(restored);
   setReady(true);
   if(backup){
    version.current=1;
    persistedVersion.current=0;
    setRevision(1);
    setStatus("recovered");
   }else{
    version.current=0;
    persistedVersion.current=0;
    setRevision(0);
    setStatus(data?"saved":"clean");
    setLastSaved(data?.updated_at||null);
   }
  }
  void load();
  return()=>{active=false};
 },[key,reviewerId,submissionId,reload]);

 const saveDraft=useCallback(()=>{
  if(!ready||submittingRef.current)return Promise.resolve();
  const snapshot={...current.current};
  const snapshotVersion=version.current;
  if(snapshotVersion<=persistedVersion.current)return Promise.resolve();
  const task=queue.current.catch(()=>undefined).then(async()=>{
   if(submittingRef.current||snapshotVersion<=persistedVersion.current)return;
   setStatus("saving");
   const {error:saveError}=await db.from("aspectus_review_drafts").upsert({
    reviewer_id:reviewerId,submission_id:submissionId,org_id:orgId,
    feedback:snapshot.feedback,publishing_decision:snapshot.publishing_decision
   },{onConflict:"reviewer_id,submission_id"});
   if(saveError){
    setError("Cloud save failed: "+saveError.message+". Your edits are retained in this browser. Use Retry save when connected.");
    setStatus("error");
    return;
   }
   persistedVersion.current=Math.max(persistedVersion.current,snapshotVersion);
   if(version.current===snapshotVersion){
    try{window.localStorage.removeItem(key)}catch{/* Cloud copy is already saved. */}
    setLastSaved(new Date().toISOString());
    setError("");
    setStatus("saved");
   }else{
    setStatus("editing");
   }
  });
  queue.current=task.catch(()=>undefined);
  return task;
 },[key,orgId,ready,reviewerId,submissionId]);

 useEffect(()=>{
  if(!ready||revision<=persistedVersion.current||submittingRef.current)return;
  const timer=window.setTimeout(()=>{void saveDraft()},850);
  return()=>window.clearTimeout(timer);
 },[ready,revision,saveDraft]);

 function edit(next:Draft){
  if(submittingRef.current||submitted)return;
  current.current=next;
  setDraft(next);
  version.current++;
  setRevision(version.current);
  setStatus("editing");
  setError("");
  try{window.localStorage.setItem(key,JSON.stringify(next))}catch{
   setError("This browser cannot keep a recovery copy. Please check for the Saved to Hub confirmation before leaving.");
  }
 }

 async function submitDecision(decision:Decision){
  if(submittingRef.current||submitted||!ready)return;
  const snapshot={...current.current};
  if(decision!=="approved"&&!snapshot.feedback.trim()){
   setError("Write feedback before approving with changes or requesting a redo.");
   return;
  }
  // Wait for any outstanding draft upserts; final review is a separate explicit action.
  submittingRef.current=true;
  setSubmitting(true);
  setError("");
  try{
   await queue.current.catch(()=>undefined);
   const {error:reviewError}=await db.rpc("aspectus_review_submission",{
    p_submission_id:submissionId,p_decision:decision,
    p_publishing_decision:snapshot.publishing_decision,
    p_feedback:snapshot.feedback
   });
   if(reviewError)throw reviewError;
   setSubmitted(true);
   setStatus("submitted");
   try{window.localStorage.removeItem(key)}catch{/* Final review is stored in the Hub. */}
   await onReviewed();
  }catch(caught){
   // Keep the local draft if a final decision fails, so reviewers can safely retry.
   setError("The review was not confirmed on this screen: "+(caught instanceof Error?caught.message:String(caught))+". Check the review status before trying again.");
   if(!submitted)setStatus("error");
   submittingRef.current=false;
   setSubmitting(false);
  }
 }
 if(submitted)return <section className="rounded-xl border border-[#00A859]/30 bg-[#F2FAF5] p-5" role="status">
  <p className="font-extrabold text-[#006F43]">Review submitted successfully.</p>
  <p className="text-sm mt-2 text-[#006F43]">The private draft has been cleared. Ian&apos;s assignment status now reflects your review decision.</p>
 </section>;

 return <section className="pt-3 border-t border-[#EADFD3] space-y-4">
  <div className="flex items-center justify-between gap-3 flex-wrap">
   <div>
    <p className="text-sm uppercase tracking-wider font-extrabold text-[#00753E]">Private review draft</p>
    <p className="text-xs text-[#6B6466] mt-1">Saved to your reviewer account, not submitted to the learner until you choose a decision.</p>
   </div>
   <span role="status" aria-live="polite" className={"rounded-full px-3 py-2 text-xs font-extrabold "+(status==="saved"?"bg-[#D3F2E2] text-[#006F43]":status==="error"?"bg-[#F7E1E1] text-[#9B1D20]":"bg-[#FEEBD5] text-[#8B572B]")}>
    {status==="loading"?"Loading draft…":status==="saved"?"✓ Saved to Hub":status==="saving"?"Saving to Hub…":status==="editing"?"Unsaved changes · browser backup":status==="recovered"?"Recovered draft · syncing":status==="error"?"Save needs attention":status==="submitted"?"Review submitted":"Auto-save enabled"}
   </span>
  </div>
  {!ready?<div className="rounded-xl bg-[#FFFBF6] p-4">
   <p className="text-sm text-[#6B6466]">{status==="loading"?"Loading your saved feedback before editing…":"Your draft couldn't be loaded safely. Please retry before editing, so existing feedback isn't overwritten."}</p>
   {status==="error"&&<button type="button" className="mt-3 rounded-xl bg-[#FAA954] px-4 py-2 text-sm font-extrabold" onClick={()=>setReload(x=>x+1)}>Retry loading feedback</button>}
  </div>:<>
   <div className="rounded-xl border border-[#00A859]/30 bg-[#F2FAF5] p-4 space-y-2">
    <label className="block font-bold text-base text-[#00753E]" htmlFor={"publish-"+submissionId}>Separate publishing decision</label>
    <p className="text-sm text-[#6B6466]">Passing a learning assignment does not grant permission to publish it publicly.</p>
    <select id={"publish-"+submissionId} aria-label="Publishing decision" className={fieldClass} disabled={submitting}
     value={draft.publishing_decision} onBlur={()=>void saveDraft()}
     onChange={e=>edit({...current.current,publishing_decision:e.target.value as PublishingDecision})}>
     <option value="not_reviewed">Not reviewed for publishing</option>
     <option value="approved_to_publish">Approved to publish</option>
     <option value="needs_changes">Needs changes before publishing</option>
     <option value="do_not_publish">Do not publish</option>
    </select>
   </div>
   <div>
    <label htmlFor={"review-"+submissionId} className="text-base font-bold">Review feedback</label>
    <textarea id={"review-"+submissionId} aria-label="Feedback" className={fieldClass+" mt-2"}
     rows={4} maxLength={20000} disabled={submitting}
     placeholder="What worked well? What should the learner keep, adjust or redo?"
     value={draft.feedback} onBlur={()=>void saveDraft()}
     onChange={e=>edit({...current.current,feedback:e.target.value})}/>
   </div>
   <div className="flex justify-between flex-wrap gap-3 items-center">
    <p className="text-xs text-[#6B6466]">{lastSaved&&status==="saved"?"Last saved "+new Date(lastSaved).toLocaleString("en-KE"):"Your edits are also backed up on this device until the Hub confirms saving."}</p>
    <button type="button" disabled={submitting} className="rounded-xl border border-[#EADFD3] bg-white px-4 py-2.5 text-sm font-extrabold hover:border-[#FAA954] disabled:opacity-50" onClick={()=>void saveDraft()}>
     {status==="error"?"Retry save":"Save draft now"}
    </button>
   </div>
   <div className="grid sm:grid-cols-3 gap-3">
    <button disabled={submitting} className="rounded-xl bg-[#00A859] text-white font-extrabold px-4 py-3 text-left disabled:opacity-50"
     onClick={()=>void submitDecision("approved")}>✓ Approve as is<span className="block text-sm font-normal mt-1">No further changes needed</span></button>
    <button disabled={submitting||!draft.feedback.trim()} className="rounded-xl bg-[#FEEBD5] text-[#373435] font-extrabold px-4 py-3 text-left disabled:opacity-45"
     onClick={()=>void submitDecision("approved_with_changes")}>✎ Approve with changes<span className="block text-sm font-normal mt-1">Accepted; feedback for improvements</span></button>
    <button disabled={submitting||!draft.feedback.trim()} className="rounded-xl bg-[#F7E1E1] text-[#9B1D20] font-extrabold px-4 py-3 text-left disabled:opacity-45"
     onClick={()=>void submitDecision("revision_requested")}>↻ Request redo<span className="block text-sm font-normal mt-1">Ask for a revised submission</span></button>
   </div>
   <p className="text-xs text-[#6B6466]">A saved draft is private. Only clicking an approval or redo decision formally records feedback for the learner. Feedback is required when approving with changes or requesting a redo.</p>
  </>}
  {error&&<p role="alert" className="rounded-xl border border-[#9B1D20]/30 bg-[#FFF3F2] p-4 text-sm font-semibold text-[#9B1D20]">{error}</p>}
 </section>;
}
