/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

const db=createClient();
type Profile={id:string;full_name:string|null;email:string;work_email:string|null;role:string;role_title:string|null;department:string|null;avatar_url:string|null;is_active:boolean};
const labelForRole=(role:string)=>role==="org_admin"?"Super Admin":role==="manager"||role==="hr_manager"?"Reviewer":role==="employee"?"Learner":"Team member";

export default function AspectusProfile(){
 const [profile,setProfile]=useState<Profile|null>(null);
 const [imageUrl,setImageUrl]=useState("");
 const [picked,setPicked]=useState<File|null>(null);
 const [preview,setPreview]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const {data:auth}=await db.auth.getUser();
   if(!auth.user)throw Error("Please sign in to access your Aspectus profile.");
   const {data:user,error:userError}=await db.from("users")
     .select("id,full_name,email,work_email,role,role_title,department,avatar_url,is_active")
     .eq("id",auth.user.id).maybeSingle();
   if(userError||!user?.is_active)throw Error("Your active Aspectus account could not be loaded.");
   setProfile(user);
   if(user.avatar_url){
    const {data:photo,error:photoError}=await db.storage.from("aspectus-avatars").createSignedUrl(user.avatar_url,60*60);
    if(photoError)throw Error("Your account was loaded, but the current photo could not be displayed: "+photoError.message);
    setImageUrl(photo?.signedUrl||"");
   }else setImageUrl("");
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 function choose(file:File|undefined){
  setMessage("");setError("");
  if(preview)URL.revokeObjectURL(preview);
  setPreview("");setPicked(null);
  if(!file)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>2*1024*1024){
   setError("Choose a JPG, PNG or WebP image smaller than 2 MB.");
   return;
  }
  setPicked(file);setPreview(URL.createObjectURL(file));
 }
 async function upload(){
  if(!profile||!picked||busy)return;
  setBusy(true);setError("");setMessage("");
  const oldPath=profile.avatar_url;
  const ext=picked.type==="image/png"?"png":picked.type==="image/webp"?"webp":"jpg";
  const newPath=profile.id+"/"+crypto.randomUUID()+"."+ext;
  try{
   const {error:uploadError}=await db.storage.from("aspectus-avatars")
     .upload(newPath,picked,{contentType:picked.type,cacheControl:"3600",upsert:false});
   if(uploadError)throw Error("Upload failed: "+uploadError.message);
   const {error:saveError}=await db.rpc("aspectus_set_my_avatar",{p_storage_path:newPath});
   if(saveError){
    await db.storage.from("aspectus-avatars").remove([newPath]);
    throw Error("Could not attach the photo to your account: "+saveError.message);
   }
   if(oldPath&&oldPath!==newPath)await db.storage.from("aspectus-avatars").remove([oldPath]);
   setPicked(null);setPreview("");
   await load();
   setMessage("Profile photo saved. Your other accounts and course progress are unchanged.");
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 async function remove(){
  if(!profile?.avatar_url||busy)return;
  setBusy(true);setError("");setMessage("");
  const oldPath=profile.avatar_url;
  const {error:rpcError}=await db.rpc("aspectus_set_my_avatar",{p_storage_path:null});
  if(rpcError){setError("Could not remove the photo: "+rpcError.message);setBusy(false);return}
  await db.storage.from("aspectus-avatars").remove([oldPath]);
  setPicked(null);setPreview("");await load();
  setMessage("Profile photo removed. Your initials will appear instead.");
  setBusy(false);
 }
 const initial=(profile?.full_name||profile?.email||"A").trim().slice(0,1).toUpperCase();
 return <main className="min-h-screen bg-[#FFFBF6] text-[#373435] px-4 sm:px-7 py-8">
  <div className="max-w-3xl mx-auto space-y-6">
   <header className="rounded-[26px] overflow-hidden border border-[#EADFD3] bg-white">
    <div className="h-2 bg-[#FAA954]"/>
    <div className="p-6 sm:p-9 flex flex-wrap justify-between gap-4 items-center">
     <div><p className="text-sm font-black uppercase tracking-[.14em] text-[#A15F16]">Aspectus Learning Hub</p><h1 className="text-3xl sm:text-4xl font-black mt-2">My profile</h1><p className="text-base mt-2 text-[#6B6466]">Your identity and personal learning journey, in one place.</p></div>
     <Link className="rounded-xl border border-[#EADFD3] px-4 py-3 text-base font-bold" href="/aspectus">← Back to Hub</Link>
    </div>
   </header>
   {loading&&<div className="rounded-2xl border border-[#EADFD3] bg-white p-6">Loading your profile…</div>}
   {profile&&!loading&&<section className="rounded-[26px] border border-[#EADFD3] bg-white p-6 sm:p-9 space-y-6">
    <div className="flex flex-wrap items-start gap-6">
     <div className="relative w-32 h-32 shrink-0 rounded-full overflow-hidden border-4 border-[#FEEBD5] bg-[#373435] text-white grid place-items-center">
      {preview||imageUrl?<img alt="Your profile photo" src={preview||imageUrl} className="w-full h-full object-cover"/>:<span className="font-black text-5xl">{initial}</span>}
     </div>
     <div className="flex-1 min-w-[210px]">
      <h2 className="text-2xl font-black">{profile.full_name||"Team member"}</h2>
      <p className="text-[#6B6466] mt-1">{profile.role_title||labelForRole(profile.role)}{profile.department?" · "+profile.department:""}</p>
      <p className="text-base text-[#6B6466] mt-2">{profile.email}</p>
      {profile.work_email&&profile.work_email!==profile.email&&<p className="text-sm text-[#6B6466] mt-1">Work email: {profile.work_email}</p>}
      <span className="inline-block rounded-full bg-[#D3F2E2] text-[#00753E] px-3 py-1.5 text-sm font-bold mt-3">{labelForRole(profile.role)}</span>
     </div>
    </div>
    <div className="border-t border-[#EADFD3] pt-6 space-y-4">
     <div><h3 className="font-black text-xl">Profile picture</h3><p className="text-base mt-2 text-[#6B6466]">Choose a square or portrait photograph. We'll crop it to a circle for display. JPG, PNG or WebP; maximum 2 MB.</p></div>
     <label className="inline-flex items-center gap-3 rounded-xl border-2 border-dashed border-[#E8CFAE] bg-[#FFF8ED] px-5 py-4 font-extrabold cursor-pointer hover:border-[#FAA954]">📷 Choose a photo
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>choose(e.target.files?.[0])}/>
     </label>
     {picked&&<p className="text-sm text-[#6B6466]">{picked.name} · {(picked.size/1024).toFixed(0)} KB · Preview above</p>}
     <div className="flex flex-wrap gap-3">
      <button type="button" disabled={!picked||busy} onClick={()=>void upload()} className="rounded-xl bg-[#FAA954] px-5 py-3 font-extrabold disabled:opacity-50">{busy?"Saving…":"Save profile photo"}</button>
      {profile.avatar_url&&<button type="button" disabled={busy} onClick={()=>void remove()} className="rounded-xl border border-[#EADFD3] px-5 py-3 font-bold disabled:opacity-50">Remove photo</button>}
     </div>
    </div>
    <div className="rounded-2xl bg-[#FFF9F0] border border-[#EADFD3] p-5"><h3 className="font-black text-lg">Your learning profile</h3><p className="text-base mt-2 text-[#6B6466]">Your actual saved quizzes, lesson steps and practical work can already tell the story of your progress. This is evidence-based, not an AI judgment of your ability.</p><Link href="/aspectus/learning-profile" className="inline-block mt-3 text-[#A15F16] font-extrabold underline">View my learning profile →</Link></div>
   </section>}
   {message&&<p role="status" className="rounded-xl border border-[#BCE8CF] bg-[#D3F2E2] p-4 font-semibold text-[#00753E]">{message}</p>}
   {error&&<p role="alert" className="rounded-xl border border-[#9B1D20]/30 bg-[#FFF2EF] p-4 font-semibold text-[#9B1D20]">{error}</p>}
   <p className="text-sm text-[#6B6466]">Photos are kept in private Aspectus storage and can be viewed by active colleagues in the same organization. Only you can change your own picture. This does not change your role, assigned modules or course progress.</p>
  </div>
 </main>;
}
