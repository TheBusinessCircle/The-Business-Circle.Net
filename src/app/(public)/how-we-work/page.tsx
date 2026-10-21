import { notFound } from "next/navigation";
import { HowWeWork } from "@/components/bcn-v2/info-pages";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { createPageMetadata } from "@/lib/seo";
export const metadata=createPageMetadata({title:"How BCN Works and Earns",description:"Free tools, careful introductions and clear commercial disclosures.",path:"/how-we-work"});
export default function Page(){if(!isBcnV2Enabled())notFound();return <HowWeWork/>;}
