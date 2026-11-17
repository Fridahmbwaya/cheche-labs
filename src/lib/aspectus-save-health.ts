import {createClient} from "@/lib/supabase/client";

/** Best-effort, privacy-preserving monitoring. Never logs answers, customer data, or feedback. */
export type AspectusSaveOperation =
 "lesson_progress"|"quiz_result"|"assignment_upload"|"assignment_submission"|
 "review_draft"|"review_decision";

export async function logAspectusSaveFailure(params:{
 orgId:string;
 actorId:string;
 operation:AspectusSaveOperation;
 moduleId?:string|null;
 errorCode?:string|null;
}):Promise<void>{
 if(!params.orgId||!params.actorId)return;
 const errorCode=(params.errorCode||"unknown").replace(/[^a-zA-Z0-9_\-]/g,"_").slice(0,64)||"unknown";
 try{
  // Save errors may coincide with connectivity outages, so this log cannot be exhaustive.
  await createClient().from("aspectus_save_errors").insert({
   org_id:params.orgId,
   actor_id:params.actorId,
   module_id:params.moduleId||null,
   operation:params.operation,
   error_code:errorCode
  });
 }catch{
  // Monitoring must never block or replace the original user-facing save error.
 }
}
