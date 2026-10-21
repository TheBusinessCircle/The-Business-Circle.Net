import { notFound } from "next/navigation";
import { Connections } from "@/components/bcn-v2/info-pages";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { createPageMetadata } from "@/lib/seo";
export const metadata=createPageMetadata({title:"Business Connections",description:"Free business profiles and permission-based introductions.",path:"/connections"});
export default function Page(){if(!isBcnV2Enabled())notFound();return <Connections/>;}
