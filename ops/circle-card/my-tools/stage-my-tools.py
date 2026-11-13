#!/usr/bin/env python3
"""Apply the Circle Card My Tools UI overlay to an ISOLATED candidate release.

This script intentionally never copies a release, launches a service, changes nginx,
runs migrations, alters entitlements or sends email. Operators must supply the
candidate path explicitly; passing the currently running release is rejected.
"""
from pathlib import Path
import argparse
import os
import re
import subprocess

SHELL = Path("src/components/circle-card/circle-experience-shell.tsx")
PAGE = Path("src/app/(member)/app/tools/page.tsx")
CATALOG = Path("src/components/circle-card/circle-card-my-tools-client.tsx")

PAGE_TEXT = r'''import {redirect} from "next/navigation";
import {loadCircleWorkspace} from "@/server/circle-card/workspace.service";
import {hasCircleCardModule} from "@/lib/circle-card/profile-modules";
import {CircleCardMyToolsClient} from "@/components/circle-card/circle-card-my-tools-client";

export const dynamic = "force-dynamic";

export default async function MyToolsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query = await searchParams;
  const cardId = typeof query.cardId === "string" ? query.cardId : undefined;
  const {card,access} = await loadCircleWorkspace(cardId);
  const hasProAccess = access.hasProAccess;
  const businessEnabled = card ? hasCircleCardModule(card,"business") : false;
  const creatorEnabled = card ? hasCircleCardModule(card,"creator") : false;
  return <main className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Circle Card Pro</p>
    <h1 className="mt-2 font-display text-3xl font-semibold">My Tools</h1>
    <p className="mt-2 max-w-2xl text-sm text-slate-300">Tools for creators and businesses, together in one place. Switch between collections whenever you like.</p></div>
    {!card?<div className="rounded-xl border border-white/15 p-4"><p>Create your Circle Card to use these tools.</p><a className="mt-3 inline-block underline" href="/app/onboarding">Create my card</a></div>:null}
    {!hasProAccess?<div className="rounded-xl border border-amber-300/35 bg-amber-200/5 p-4 text-sm">Your My Tools collection is locked on Free. Your free card, connections, wallet and scanner remain available. <a href="/pro?returnTo=%2Fapp%2Ftools" className="font-semibold text-cyan-200 underline">Explore Pro</a>.</div>:null}
    <CircleCardMyToolsClient hasPro={hasProAccess} cardId={card?.id??null}
      businessEnabled={businessEnabled} creatorEnabled={creatorEnabled}/>
  </main>;
}
'''

CATALOG_TEXT = r'''"use client";
import Link from "next/link";
import {useState} from "react";
import {BriefcaseBusiness,LockKeyhole,Sparkles} from "lucide-react";

const tools = [
  {key:"media-kit",category:"creator",title:"Media Kit",description:"Introduce your brand to collaborators.",href:"/app/edit/creator/media-kit"},
  {key:"audience",category:"creator",title:"Audience Snapshot",description:"Present your audience and reach.",href:"/app/edit/creator/audience"},
  {key:"services",category:"business",title:"Services",description:"Explain your business services.",href:"/app/edit/business/services"},
  {key:"products",category:"business",title:"Products",description:"Show visitors what you sell.",href:"/app/edit/business/products"},
  {key:"prices",category:"business",title:"Price Lists",description:"Display pricing clearly.",href:"/app/edit/business/prices"},
  {key:"offers",category:"business",title:"Offers",description:"Share your offers and menus.",href:"/app/edit/business/offers"},
  {key:"booking",category:"business",title:"Bookings",description:"Make enquiries and bookings easier.",href:"/app/edit/business/booking"},
  {key:"documents",category:"business",title:"Documents",description:"Manage your existing documents section. File-link uploads remain disabled pending a security review.",href:"/app/edit/business/documents"},
  {key:"gallery",category:"business",title:"Gallery",description:"Show your work.",href:"/app/edit/business/gallery"},
  {key:"reviews",category:"business",title:"Reviews",description:"Present customer feedback.",href:"/app/edit/business/reviews"},
  {key:"hours",category:"business",title:"Opening Hours",description:"Help people know when to visit.",href:"/app/edit/business/hours"}
] as const;
type Category = "creator" | "business";
export function CircleCardMyToolsClient({hasPro,cardId,businessEnabled,creatorEnabled}:{hasPro:boolean;cardId:string|null;businessEnabled:boolean;creatorEnabled:boolean}){
 const [category,setCategory]=useState<Category>("creator");
 const enabled=category==="creator"?creatorEnabled:businessEnabled;
 return <section aria-label="My Tools catalogue">
   <div className="mb-5 flex flex-wrap gap-3" role="group" aria-label="Choose your tools collection">
     {(["creator","business"] as const).map(option=><button type="button" key={option}
       aria-pressed={category===option} onClick={()=>setCategory(option)}
       className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${category===option?"border-cyan-300 bg-cyan-400/15 text-cyan-200":"border-white/20 text-slate-300"}`}>
       {option==="creator"?<Sparkles size={17}/>:<BriefcaseBusiness size={17}/>}
       {option==="creator"?"Creators":"Business"}</button>)}
   </div>
   {hasPro&&cardId&&!enabled?<div className="mb-5 rounded-xl border border-cyan-300/30 bg-cyan-300/5 p-4 text-sm">
     This card does not currently have its {category} section enabled. <Link className="font-semibold text-cyan-200 underline" href={`/app/edit?cardId=${encodeURIComponent(cardId)}`}>Configure card sections</Link> to use these tools.
   </div>:null}
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
     {tools.filter(tool=>tool.category===category).map(tool=><article key={tool.key}
       className={`flex flex-col rounded-2xl border border-white/15 bg-white/[0.035] p-5 ${!hasPro?"opacity-60":""}`}>
       <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
         <span>{category==="creator"?"Creator":"Business"} tool</span>{!hasPro?<LockKeyhole size={17} aria-label="Pro required"/>:null}
       </div>
       <h2 className="text-lg font-semibold">{tool.title}</h2>
       <p className="mt-2 flex-1 text-sm text-slate-300">{tool.description}</p>
       {!hasPro?<Link className="mt-5 inline-block w-fit rounded-lg border border-amber-300/30 px-3 py-2 text-sm font-semibold" href="/pro?returnTo=%2Fapp%2Ftools">Unlock with Pro</Link>:
       !cardId?<Link className="mt-5 inline-block w-fit rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold" href="/app/onboarding">Create my card</Link>:
       !enabled?<Link className="mt-5 inline-block w-fit rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold" href={`/app/edit?cardId=${encodeURIComponent(cardId)}`}>Set up section</Link>:
       <Link className="mt-5 inline-block w-fit rounded-lg border border-cyan-300/40 px-3 py-2 text-sm font-semibold text-cyan-200" href={`${tool.href}?cardId=${encodeURIComponent(cardId)}`}>Open tool</Link>}
     </article>)}
   </div>
 </section>;
}
'''

def replace_exact(text, old, new):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one shell anchor but found {count}: {old[:100]}")
    return text.replace(old, new, 1)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--candidate",required=True,help="Existing isolated release copy, never the running live release")
    parser.add_argument("--inspect-only",action="store_true")
    args=parser.parse_args()
    root=Path(args.candidate).resolve(strict=True)
    allowed=Path("/var/www/releases").resolve()
    if not root.is_relative_to(allowed) or not root.name.startswith("circle-card-my-tools-"):
        raise RuntimeError("Candidate must live under /var/www/releases/circle-card-my-tools-*")
    if os.geteuid()!=0:raise RuntimeError("Must run as root for candidate file ownership")
    for unit in subprocess.check_output(["systemctl","list-units","--type=service","--state=running","--no-legend"],text=True).splitlines():
        name=unit.split()[0] if unit.split() else ""
        if not name.startswith("circle-card-"):continue
        wd=subprocess.check_output(["systemctl","show",name,"-p","WorkingDirectory","--value"],text=True).strip()
        if Path(wd).resolve()==root:raise RuntimeError("Refusing to modify a running release")
    shell=(root/SHELL)
    if not shell.is_file():raise RuntimeError("Missing live shell; stopped without changes")
    if (root/PAGE).exists() or (root/CATALOG).exists():raise RuntimeError("My Tools overlay already exists")
    s=shell.read_text()
    s=replace_exact(s,"import {ContactRound,Users,Share2,Settings,ChevronRight} from \"lucide-react\";",
      "import {ContactRound,Users,Share2,Settings,ChevronRight,Wrench} from \"lucide-react\";")
    s=replace_exact(s,'{key:"share",label:"Share",href:"/app/share",Icon:Share2}] as const;',
      '{key:"share",label:"Share",href:"/app/share",Icon:Share2},{key:"tools",label:"My Tools",href:"/app/tools",Icon:Wrench}] as const;')
    s=replace_exact(s,'const current=circlePrimaryDestination(pathname);',
      'const current=pathname==="/app/tools"?"tools":circlePrimaryDestination(pathname);')
    s=replace_exact(s,'mobile?"grid grid-cols-3":"space-y-2"','mobile?"grid grid-cols-4":"space-y-2"')
    s=replace_exact(s,'<Settings size={17}/>Settings</Link>',
      '<Settings size={17}/>Settings</Link><Link className="flex min-h-11 items-center gap-3 rounded-lg px-3 hover:bg-white/5" href="/app/tools"><Wrench size={17}/>My Tools</Link>')
    if args.inspect_only:
        print("VALIDATED: live shell anchors, candidate isolation and tool overlay")
        return
    (root/PAGE).parent.mkdir(parents=True,exist_ok=True)
    (root/CATALOG).parent.mkdir(parents=True,exist_ok=True)
    # All checks above complete before changing any candidate file.
    (root/PAGE).write_text(PAGE_TEXT)
    (root/CATALOG).write_text(CATALOG_TEXT)
    shell.write_text(s)
    print("STAGED: My Tools route, client catalogue, four-tab navigation and account shortcut.")
    print("NOT DEPLOYED: active service and nginx untouched. Build/test candidate before switching.")

if __name__=="__main__":
    main()
