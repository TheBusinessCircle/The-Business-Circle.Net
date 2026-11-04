import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicCircleCard } from "@/server/circle-card";
import { ConfirmAKillDraftCard, isConfirmAKillDraft, CONFIRM_DRAFT_ID, CONFIRM_DRAFT_SLUG, CONFIRM_GOOGLE_REVIEWS } from "./confirm-draft-card";

const url=`https://circlecard.co.uk/prepared/${CONFIRM_DRAFT_SLUG}`;
const card={id:CONFIRM_DRAFT_ID,slug:CONFIRM_DRAFT_SLUG,cardType:"BUSINESS",isDemo:true,
  user:{hasCircleCardProAccess:true},websiteUrl:"https://www.confirmakill.co.uk/",
  businessName:"Confirm A Kill",fullName:"Confirm A Kill",about:"Saved business details",
  phone:"0115 913 5724",email:"enquiries@confirmakill.co.uk",location:"Nottinghamshire",
  galleryItems:[],services:[],customLinks:[]} as unknown as PublicCircleCard;
function render(overrides:Partial<PublicCircleCard>={}) {
  return renderToStaticMarkup(createElement(ConfirmAKillDraftCard,{card:{...card,...overrides},
    identity:createElement("button",null,"Native draft spin"),actions:createElement("div",null,"Native actions"),
    connection:createElement("div",null,"Native connection"),trust:createElement("div",null,"Native trust"),
    qr:createElement("div",null,"Native QR"),contactDownloadHref:`/prepared/${CONFIRM_DRAFT_SLUG}/vcard`}));
}
describe("Confirm A Kill private draft",()=>{
  it("requires an owned Pro preview, official site, demo identity and exact prepared route",()=>{
    expect(isConfirmAKillDraft(card,url,true)).toBe(true);
    expect(isConfirmAKillDraft(card,url)).toBe(false);
    for(const overrides of [{slug:"precision-finish"},{cardType:"PERSONAL"},{isDemo:false},
      {websiteUrl:"https://confirmakill.co.uk.evil.example/"},{websiteUrl:"http://confirmakill.co.uk/"}])
      expect(isConfirmAKillDraft({...card,...overrides} as PublicCircleCard,url,true)).toBe(false);
    const synthetic={...card,id:'synthetic-preview',user:{...card.user,hasCircleCardProAccess:false}};
    expect(isConfirmAKillDraft(synthetic,url,true)).toBe(true);
    for(const other of ["https://circlecard.co.uk/card/"+CONFIRM_DRAFT_SLUG,"https://other.example/prepared/"+CONFIRM_DRAFT_SLUG,"invalid"])
      expect(isConfirmAKillDraft(card,other,true)).toBe(false);
  });
  it("keeps call and quote prominent and Google reviews directly after Visit Website",()=>{
    const html=render();const anchors=html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g)??[];
    const website=anchors.findIndex(a=>a.includes('Visit Website'));
    expect(anchors[website+1]).toContain('Read our Google reviews');
    expect(html.indexOf('Call 0115 913 5724')).toBeLessThan(html.indexOf('Visit Website'));
    expect(html).toContain(CONFIRM_GOOGLE_REVIEWS.replaceAll('&','&amp;'));
    const text=html.replace(/<[^>]*>/g,'');
    expect(text).not.toContain('4.9');expect(text).not.toContain('125 reviews');
  });
  it("uses saved business content and preserves the native draft controls",()=>{
    const html=render();for(const text of ['Saved business details','Native draft spin','Native actions','Native connection','Native trust','Native QR']) expect(html).toContain(text);
    expect(html).toContain('tel:01159135724');expect(html).toContain(`/prepared/${CONFIRM_DRAFT_SLUG}/vcard`);
    expect(render({phone:null,email:null})).not.toContain('href="tel:');
    expect(render({phone:null,email:null})).not.toContain('href="mailto:');
  });
  it("excludes private, expired and unsafe saved destinations",()=>{
    const link={id:"public",label:"Saved public route",url:"https://www.confirmakill.co.uk/news-views/",visibility:"PUBLIC",expiresAt:null};
    const html=render({customLinks:[link,{...link,id:"private",label:"Private route",visibility:"PRIVATE_CODE"},
      {...link,id:"expired",label:"Expired route",expiresAt:new Date('2000-01-01')},
      {...link,id:"unsafe",label:"Unsafe route",url:"javascript:alert(1)"}] as PublicCircleCard["customLinks"]});
    expect(html).toContain('Saved public route');for(const text of ['Private route','Expired route','Unsafe route']) expect(html).not.toContain(text);
  });
});
