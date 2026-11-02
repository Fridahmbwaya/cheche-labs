"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AspectusAuthCallback() {
 const [message,setMessage]=useState("Signing you in to Aspectus…");
 useEffect(()=>{
  let cancelled=false;
  const finish=async()=>{
   try {
    const db=createClient();
    const url=new URL(window.location.href);
    const code=url.searchParams.get("code");
    const tokenHash=url.searchParams.get("token_hash");
    const type=url.searchParams.get("type");
    const hash=new URLSearchParams(url.hash.slice(1));
    const error=hash.get("error_description")||url.searchParams.get("error_description");
    if(error) throw new Error(error);
    if(code){const {error}=await db.auth.exchangeCodeForSession(code);if(error)throw error;}
    else if(tokenHash){const {error}=await db.auth.verifyOtp({token_hash:tokenHash,type:type==="signup"?"signup":"magiclink"});if(error)throw error;}
    else if(hash.get("access_token")&&hash.get("refresh_token")){
      const {error}=await db.auth.setSession({access_token:hash.get("access_token")!,refresh_token:hash.get("refresh_token")!});
      if(error)throw error;
    }
    const {data:{user},error:authError}=await db.auth.getUser();
    if(authError||!user)throw new Error("Sign-in link could not establish a session. Please request a new link.");
    const {data:profile}=await db.from("users").select("id,role,org_id").eq("id",user.id).single();
    if(!profile){await db.rpc("aspectus_claim_pending_account");const check=await db.from("users").select("id").eq("id",user.id).maybeSingle();if(!check.data)throw new Error("This email is not yet registered as an Aspectus learner or manager.");}
    if(!cancelled)window.location.replace("/aspectus");
   }catch(e){if(!cancelled)setMessage(e instanceof Error?e.message:"Sign-in failed. Please request another link.");}
  };void finish();return()=>{cancelled=true};
 },[]);
 return <main className="min-h-screen grid place-items-center bg-[#FFF9F2] p-6"><div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold">Aspectus Learning Hub</h1><p role="status" className="mt-4 text-stone-600">{message}</p><a className="mt-6 inline-block underline text-orange-800" href="/preview/aspectus-welcome.html">Back to sign in</a></div></main>;
}
