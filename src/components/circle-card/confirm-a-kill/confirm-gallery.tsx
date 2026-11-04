"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { isValidCircleCardGalleryImageUrl, type CircleCardGalleryItem } from "@/lib/circle-card/content-blocks";
import styles from "./confirm-a-kill.module.css";

export function ConfirmAKillGallery({items}:{items:CircleCardGalleryItem[]}) {
  const [selected,setSelected]=useState<CircleCardGalleryItem|null>(null);
  const [failed,setFailed]=useState<string[]>([]);
  const dialog=useRef<HTMLDialogElement>(null);
  const visible=items.filter(item=>item.isActive&&isValidCircleCardGalleryImageUrl(item.imageUrl)&&!failed.includes(item.id));
  useEffect(()=>{
    if(!selected||!dialog.current)return;
    const el=dialog.current;
    el.showModal();
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{el.close();document.body.style.overflow=overflow;};
  },[selected]);
  if(!visible.length)return null;
  return <section id="confirm-work" className={styles.portfolio} aria-labelledby="confirm-work-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>PEOPLE, PROPERTY & PEACE OF MIND</p><h2 id="confirm-work-title">Discreet care.<br /><em>Practical protection.</em></h2></div><p>Images from Confirm A Kill’s website. Tap to take a closer look.</p></div><div className={styles.gallery}>{visible.map((item,index)=><article key={item.id} className={`${styles.project} ${index===0?styles.projectLead:""}`}><button type="button" aria-label={`Enlarge ${item.title}`} onClick={()=>setSelected(item)}><img src={item.imageUrl} alt={item.title} loading="lazy" onError={()=>setFailed(old=>[...old,item.id])}/><span className={styles.zoom}><ArrowUpRight size={19} aria-hidden="true" /></span></button><div className={styles.projectCaption}><div><h3>{item.title}</h3>{item.description?<p>{item.description}</p>:null}</div><span>{String(index+1).padStart(2,"0")}</span></div></article>)}</div><dialog ref={dialog} className={styles.lightbox} onCancel={()=>setSelected(null)} onClick={e=>{if(e.target===e.currentTarget)setSelected(null);}} aria-label={selected?.title||"Business photograph"}>{selected?<div><button type="button" onClick={()=>setSelected(null)} aria-label="Close enlarged business photograph" autoFocus><X size={23} /></button><img src={selected.imageUrl} alt={selected.title}/><h3>{selected.title}</h3>{selected.description?<p>{selected.description}</p>:null}</div>:null}</dialog></section>;
}
