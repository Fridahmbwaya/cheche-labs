/* eslint-disable @next/next/no-img-element */
"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";

export default function AvatarBadge({path,name,size=44}:{path:string|null|undefined;name:string|null|undefined;size?:number}){
 const [url,setUrl]=useState("");
 useEffect(()=>{
  let active=true;
  setUrl("");
  if(path)void createClient().storage.from("aspectus-avatars").createSignedUrl(path,3600)
    .then(({data,error})=>{if(active&&!error)setUrl(data?.signedUrl||"")});
  return()=>{active=false};
 },[path]);
 return <span className="inline-flex rounded-full bg-[#373435] text-white items-center justify-center overflow-hidden shrink-0 border-[3px] border-[#FEEBD5] font-extrabold" style={{width:size,height:size,fontSize:Math.max(15,size/2.8)}}>
  {url?<img alt={name?"Profile photo of "+name:"Profile photo"} src={url} className="h-full w-full object-cover"/>:(name?.trim()?.[0]||"?").toUpperCase()}
 </span>;
}
