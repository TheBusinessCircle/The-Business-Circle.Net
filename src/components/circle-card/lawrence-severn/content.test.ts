import { describe, it, expect } from "vitest";
import { isLawrenceSevernCard, LAWRENCE_SEVERN_SLUG, lawrencePhotoSources } from "./content";
describe("Lawrence Severn's isolated bespoke card", () => {
 it("only selects the exact approved business draft", () => {
  expect(isLawrenceSevernCard({slug:LAWRENCE_SEVERN_SLUG,cardType:"BUSINESS"})).toBe(true);
  for(const slug of ["precision-finish-plastering-rendering-ecb582748528","scalesmiths","lawrence-severn-son","__proto__"]) expect(isLawrenceSevernCard({slug,cardType:"BUSINESS"})).toBe(false);
  expect(isLawrenceSevernCard({slug:LAWRENCE_SEVERN_SLUG,cardType:"PERSONAL"})).toBe(false);
 });
 it("delivers exact original-photo crops, including enlarged views", () => {
  for(const url of Object.values(lawrencePhotoSources)) {
   expect(new URL(url).hostname).toBe("res.cloudinary.com");
   expect(url).toMatch(/\/image\/upload\/c_crop,x_0,y_\d+,w_716,h_\d+\/v\d+\//);
   expect(url).not.toMatch(/generative|enhance|fill|replace|remove|restore/);
  }
 });
});
