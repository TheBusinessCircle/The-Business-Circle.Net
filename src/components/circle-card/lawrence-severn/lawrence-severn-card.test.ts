import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LawrenceSevernCard } from "./lawrence-severn-card";
const props = { name:"Lawrence Severn & Son", phone:"0115 963 2024", location:"53 High Street, Hucknall, Nottingham NG15 7AW", contactHref:"/prepared/lawrence-severn-son-4b134d448659/vcard", isDemo:true, galleryEnabled:true };
describe("Lawrence Severn's custom presentation", () => {
 it("keeps contact routes usable and includes the real-photo gallery", () => {
  const html=renderToStaticMarkup(createElement(LawrenceSevernCard,props));
  expect(html).toContain('href="tel:01159632024"');
  expect(html).toContain('https://www.google.com/maps/search/?api=1&amp;query=53%20High%20Street');
  expect(html).toContain('href="https://www.facebook.com/share/19rVMvx7oK/"');
  expect(html).toContain('href="/prepared/lawrence-severn-son-4b134d448659/vcard"');
  expect(html).toContain('Enlarge Your everyday favourites.');
  expect(html).toContain('Not an official published business card');
  expect(html).not.toContain('Google review');
  expect(html).not.toContain('Opening Hours');
 });
 it("respects gallery entitlement and missing contact details", () => {
  const html=renderToStaticMarkup(createElement(LawrenceSevernCard,{...props,phone:null,location:null,galleryEnabled:false}));
  expect(html).not.toContain('href="tel:');
  expect(html).not.toContain('maps/search');
  expect(html).not.toContain('A proper butcher’s counter.');
 });
 it("preserves the parent's actual connection and share controls",()=>{
  const html=renderToStaticMarkup(createElement(LawrenceSevernCard,{...props,spin:createElement('button',null,'Actual spin action'),share:createElement('button',null,'Actual share action'),wallet:createElement('button',null,'Actual wallet action')}));
  for(const label of ['Actual spin action','Actual share action','Actual wallet action']) expect(html).toContain(label);
 });
 it("uses active saved photos rather than restoring removed or inactive images",()=>{
  const html=renderToStaticMarkup(createElement(LawrenceSevernCard,{...props,heroImageUrl:null,galleryItems:[{id:"active",title:"Owner's updated photo",imageUrl:"https://example.com/approved.jpg",isActive:true},{id:"inactive",title:"Removed photo",imageUrl:"https://example.com/hidden.jpg",isActive:false}]}));
  expect(html).toContain("https://example.com/approved.jpg");
  expect(html).not.toContain("https://example.com/hidden.jpg");
  expect(html).not.toContain("Your everyday favourites.");
  expect(html).not.toContain("/circle-card/clients/lawrence-severn/shopfront.jpg");
 });

 it("keeps the spinning identity without visible instruction copy",()=>{
  const html=renderToStaticMarkup(createElement(LawrenceSevernCard,props));
  expect(html.indexOf('Circle Card connection')).toBeLessThan(html.indexOf('lawrence-heading'));
  expect(html).toContain('data-preview-spin');
  expect(html).not.toContain('Spin the logo');
  expect(html).not.toContain('Tap or swipe the circle');
  expect(html).not.toContain('YOUR LOCAL BUTCHER. IN YOUR CIRCLE.');
  expect(html).toContain('No connection is created here.');
  expect(html).toContain('QUALITY BUTCHERS');
 });

});
