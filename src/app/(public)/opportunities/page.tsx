import { notFound } from "next/navigation";
import { Opportunities } from "@/components/bcn-v2/info-pages";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { createPageMetadata } from "@/lib/seo";
export const metadata=createPageMetadata({title:"Business Opportunities",description:"Future collaborations and supplier opportunities, subject to moderation.",path:"/opportunities",noIndex:true});
export default function Page(){if(!isBcnV2Enabled())notFound();return <Opportunities/>;}
