"use client";

import {useEffect,useRef,useState} from "react";
import type {ReactNode} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

const db=createClient();
const STORAGE_PREFIX="cheche-aspectus-onboarding-admin-preview-v1-";
type Mod={id:string;title:string;order_index:number;is_active:boolean};
type Choice=number|"baseline"|null;
type Session={id:string;name:string;modules:Mod[]};
const tile="rounded-2xl border border-[#EADFD3] bg-white p-4 text-left hover:border-[#FAA954] transition-colors";
function Tag({children}:{children:ReactNode}){return <span className="rounded-full border border-[#E8CFAE] bg-white px-3 py-1.5 text-xs font-extrabold text-[#7C5A33]">{children}</span>}
function storedState(userId:string){try{const raw=localStorage.getItem(STORAGE_PREFIX+userId);return raw?JSON.parse(raw) as {mods?:Record<string,{page?:number;quiz?:Record<string,number>;scen?:number|null}>;baseline?:unknown;_blStep?:number}:{}}catch{return {}}}
export default function AspectusAdminLearnerPreview(){
 const [session,setSession]=useState<Session|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [choice,setChoice]=useState<Choice>(null);
 const [frameVersion,setFrameVersion]=useState(0);
 const [status,setStatus]=useState("");
 const [practice,setPractice]=useState<ReturnType<typeof storedState>>({});
 const iframe=useRef<HTMLIFrameElement|null>(null);
 useEffect(()=>{
  let active=true;
  async function init(){
   try{
    const {data:auth,error:authError}=await db.auth.getUser();
    if(authError||!auth.user)throw Error("Sign in to an Aspectus Super Admin account first.");
    const {data:profile,error:profileError}=await db.from("users").select("id,org_id,role,full_name,is_active").eq("id",auth.user.id).maybeSingle();
    if(profileError||!profile?.is_active||profile.role!=="org_admin")throw Error("Only an active Aspectus Super Admin can open the learner preview.");
    const {data:allowed,error:adminError}=await db.rpc("aspectus_can_admin",{p_org_id:profile.org_id});
    if(adminError||!allowed)throw Error("Your account does not have Super Admin permissions.");
    const {data:track,error:trackError}=await db.from("learning_tracks").select("id").eq("org_id",profile.org_id).eq("slug","aspectus-onboarding").maybeSingle();
    if(trackError||!track)throw Error("The Aspectus Onboarding track is unavailable.");
    const {data:mods,error:modulesError}=await db.from("modules").select("id,title,order_index,is_active")
     .eq("org_id",profile.org_id).eq("track_id",track.id).eq("is_active",true).order("order_index");
    if(modulesError)throw modulesError;
    if(!active)return;
    const available=(mods||[]).filter(m=>m.order_index>=1&&m.order_index<=8);
    setSession({id:auth.user.id,name:profile.full_name||"Super Admin",modules:available});
    setPractice(storedState(auth.user.id));
    const param=new URLSearchParams(window.location.search).get("module");
    if(param==="baseline")setChoice("baseline");
    else if(param&&/^([1-8])$/.test(param)&&available.some(m=>m.order_index===Number(param)))setChoice(Number(param));
   }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to open the preview.");}
   finally{if(active)setLoading(false);}
  }
  void init();
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(!session)return;
  const handler=(event:StorageEvent)=>{
   if(event.key===STORAGE_PREFIX+session.id)setPractice(storedState(session.id));
  };
  window.addEventListener("storage",handler);
  return()=>window.removeEventListener("storage",handler);
 },[session]);
 useEffect(()=>{
  if(!session)return;
  const handler=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==iframe.current?.contentWindow)return;
   if(event.data?.source==="aspectus-admin-preview"&&event.data.type==="return-to-library"){
    setChoice(null);window.history.replaceState(null,"","/aspectus/preview");
    setPractice(storedState(session.id));
    setStatus("Practice saved in this browser. Choose any module to continue.");
   }
  };
  window.addEventListener("message",handler);
  return()=>window.removeEventListener("message",handler);
 },[session]);
 function choose(item:Choice){
  if(!session)return;
  setChoice(item);setStatus("");
  window.history.replaceState(null,"",item===null?"/aspectus/preview":"/aspectus/preview?module="+item);
  setPractice(storedState(session.id));
 }
 function resetSelected(){
  if(!session||choice===null)return;
  if(!window.confirm("Restart this practice preview? This will clear only your browser's saved answers for this module, not Ian's or any other learner's progress."))return;
  const snapshot=storedState(session.id);
  if(choice==="baseline"){delete snapshot.baseline;delete snapshot._blStep;}
  else if(snapshot.mods)delete snapshot.mods["m"+choice];
  try{
   localStorage.setItem(STORAGE_PREFIX+session.id,JSON.stringify(snapshot));
   setPractice(snapshot);setFrameVersion(v=>v+1);
   setStatus("This practice module was restarted. Actual learner records remain unchanged.");
  }catch{setStatus("Could not reset this browser's practice data. Check browser storage settings.");}
 }
 function stateFor(index:number){
  const s=practice.mods?.["m"+index];
  if(!s)return "Not started";
  if(s.quiz&&Object.keys(s.quiz).length)return "Quiz tried";
  if(typeof s.page==="number"&&s.page>0||s.scen!==null&&s.scen!==undefined)return "In progress";
  return "Started";
 }
 if(loading)return <main className="min-h-screen bg-[#FFFBF6] grid place-items-center p-6"><p className="font-extrabold text-[#373435]">Checking Super Admin preview access…</p></main>;
 if(error)return <main className="min-h-screen bg-[#FFFBF6] grid place-items-center p-6"><section className="max-w-xl rounded-3xl border border-[#EADFD3] bg-white p-8 text-[#373435]"><h1 className="text-2xl font-black">Preview unavailable</h1><p className="mt-3 text-[#6B6466]">{error}</p><Link href="/aspectus" className="inline-block mt-5 rounded-xl bg-[#FAA954] px-5 py-3 font-extrabold">Back to Learning Hub</Link></section></main>;
 if(!session)return null;
 const current=typeof choice==="number"?session.modules.find(m=>m.order_index===choice):null;
 const iframeModule=choice==="baseline"?"baseline":typeof choice==="number"?"m"+choice:null;
 return <main className="min-h-screen bg-[#FFFBF6] text-[#373435]">
  <header className="border-b border-[#EADFD3] bg-white"><div className="mx-auto max-w-7xl px-5 sm:px-8 py-4 flex flex-wrap gap-3 justify-between items-center">
   <div><p className="text-xs uppercase tracking-[.14em] font-black text-[#A55F12]">Aspectus Learning Hub / Super Admin</p><h1 className="font-black text-xl mt-1">Learner experience preview</h1></div>
   <Link href="/aspectus/admin?view=overview" className="rounded-xl border border-[#EADFD3] px-4 py-3 text-sm font-extrabold hover:border-[#FAA954]">← Back to team access</Link>
  </div></header>
  <div className="mx-auto max-w-7xl px-5 sm:px-8 py-6 sm:py-8 space-y-5">
   <section className="rounded-[27px] border border-[#F1D2A8] bg-gradient-to-br from-[#FFF0D8] via-[#FFFBF6] to-white p-6 sm:p-8">
    <div className="flex flex-wrap gap-2"><Tag>Super Admin practice only</Tag><Tag>Same eight modules as Ian</Tag><Tag>Any order</Tag></div>
    <h2 className="text-2xl sm:text-3xl font-black mt-4">Experience onboarding as a learner, without changing anyone's progress.</h2>
    <p className="mt-3 max-w-4xl text-[#6B6466] leading-relaxed">Choose any module below. Answer questions, try quizzes and revisit lessons as often as you like. Your practice is saved <strong>only in this browser</strong>, under your own separate preview record—not in Ian's account, your official course progress, or Brenda's review queue.</p>
   </section>
   {status&&<p role="status" className="rounded-xl bg-[#F3FFF8] border-l-4 border-[#00A859] p-4 font-semibold text-[#006B3B]">{status}</p>}
   <div className="grid lg:grid-cols-[285px_minmax(0,1fr)] gap-5 items-start">
    <aside className="rounded-[26px] border border-[#EADFD3] bg-white p-4 sm:p-5 lg:sticky lg:top-5">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs uppercase tracking-widest font-black text-[#A55F12]">Jump to any module</p>
      <button type="button" className="text-xs underline font-bold" onClick={()=>choose(null)}>All modules</button>
     </div>
     <div className="space-y-2 mt-4">
      <button type="button" onClick={()=>choose("baseline")} className={"block w-full rounded-xl p-3 text-left border "+(choice==="baseline"?"bg-[#FEEBD5] border-[#FAA954]":"bg-[#FFFBF6] border-[#EADFD3]")}>
       <strong className="text-sm block">Intro &amp; baseline</strong><span className="text-xs text-[#6B6466]">Optional starting questions</span>
      </button>
      {session.modules.map(m=><button type="button" key={m.id} onClick={()=>choose(m.order_index)}
       className={"w-full flex gap-3 items-start rounded-xl p-3 text-left border "+(choice===m.order_index?"bg-[#FEEBD5] border-[#FAA954]":"bg-[#FFFBF6] border-[#EADFD3]")}>
       <span className="shrink-0 rounded-lg bg-white border border-[#EADFD3] px-2 py-1 text-xs font-black">{String(m.order_index).padStart(2,"0")}</span>
       <span><strong className="block text-sm leading-snug">{m.title}</strong><span className="block text-xs mt-1 text-[#6B6466]">{stateFor(m.order_index)} · Preview anytime</span></span>
      </button>)}
     </div>
     <p className="mt-4 text-xs text-[#6B6466]">There are no prerequisites in preview mode. Sequential unlocks still apply to Ian's assigned learning.</p>
    </aside>
    <section className="min-w-0">
     {iframeModule?<div className="rounded-[26px] overflow-hidden border border-[#EADFD3] bg-white shadow-[0_10px_30px_rgba(55,52,53,.05)]">
      <div className="border-b border-[#EADFD3] p-4 sm:p-5 flex flex-wrap justify-between items-center gap-3">
       <div><p className="text-xs font-black text-[#A55F12] uppercase tracking-wider">Independent practice · Not a learner submission</p><h3 className="text-lg sm:text-xl font-black mt-1">{choice==="baseline"?"Intro & baseline":current?.title||"Onboarding module"}</h3></div>
       <div className="flex flex-wrap gap-2">
        <button type="button" onClick={resetSelected} className="rounded-xl border border-[#EADFD3] px-3 py-2.5 text-sm font-extrabold hover:border-[#FAA954]">↻ Restart this preview</button>
        <button type="button" onClick={()=>choose(null)} className="rounded-xl bg-[#FAA954] px-3 py-2.5 text-sm font-extrabold">Choose another module</button>
       </div>
      </div>
      <iframe ref={iframe} key={iframeModule+"-"+frameVersion} title={"Admin practice: "+(current?.title||"Intro & baseline")}
       src={`/preview/aspectus-staged-learning.html?embed=1&preview=1&previewer=${encodeURIComponent(session.id)}&module=${iframeModule}`}
       className="block w-full border-0 bg-[#FFFBF6] h-[min(810px,75dvh)] min-h-[500px]"/>
      <div className="border-t border-[#EADFD3] bg-[#FFFBF6] p-4 text-xs sm:text-sm text-[#6B6466]">Any answers you save here are browser-only practice. They do not update Ian's grades, assigned modules, submissions or certificates.</div>
     </div>:<div className="rounded-[26px] border border-[#EADFD3] bg-white p-6 sm:p-8 space-y-5">
      <p className="text-xs font-black uppercase tracking-widest text-[#A55F12]">Choose your starting point</p>
      <h3 className="text-2xl font-black">Explore the modules in whatever order you like.</h3>
      <p className="text-[#6B6466]">Start with Module 7 if you want to inspect the sales process, or jump into Module 1 to see the first-day experience. Nothing here is submitted for approval.</p>
      <div className="grid sm:grid-cols-2 gap-3">{session.modules.map(m=><button type="button" key={m.id} className={tile} onClick={()=>choose(m.order_index)}>
       <span className="text-xs font-extrabold tracking-wider text-[#A55F12]">MODULE {String(m.order_index).padStart(2,"0")}</span>
       <span className="block text-base font-black mt-2">{m.title}</span>
       <span className="block text-xs text-[#6B6466] mt-3">{stateFor(m.order_index)} · Open now →</span>
      </button>)}</div>
      <button type="button" onClick={()=>choose("baseline")} className="rounded-xl border border-[#EADFD3] px-4 py-3 font-extrabold text-sm hover:border-[#FAA954]">Also preview the introductory baseline →</button>
     </div>}
    </section>
   </div>
  </div>
 </main>;
}
