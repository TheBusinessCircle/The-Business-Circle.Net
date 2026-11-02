import { describe, expect, it } from "vitest";
import { preparedCardSampleHrefs, resolvePreparedCardSample } from "./sample-presentation";
describe("Free, Pro and Custom samples",()=>{
 it("keeps Custom a Pro presentation without inventing a paid plan",()=>{
  const hrefs=preparedCardSampleHrefs('/app/prepared/example/preview?plan=free&from=builder');
  expect(hrefs.free).toBe('/app/prepared/example/preview?plan=free&from=builder');
  expect(hrefs.pro).toBe('/app/prepared/example/preview?plan=pro&from=builder');
  expect(hrefs.custom).toBe('/app/prepared/example/preview?plan=pro&from=builder&presentation=custom');
  expect(resolvePreparedCardSample({plan:'pro',presentation:'custom',hasCustomPresentation:true})).toEqual({plan:'pro',presentation:'custom',sample:'custom'});
 });
 it("keeps ordinary Free and Pro samples unchanged",()=>{
  expect(resolvePreparedCardSample({plan:'free',hasCustomPresentation:true}).sample).toBe('free');
  expect(resolvePreparedCardSample({plan:'pro',hasCustomPresentation:true}).sample).toBe('pro');
  expect(resolvePreparedCardSample({plan:'free',presentation:'custom',hasCustomPresentation:true}).presentation).toBe('standard');
  expect(resolvePreparedCardSample({plan:'custom',hasCustomPresentation:true}).plan).toBe('free');
 });
 it("does not select custom for unrelated cards or invalid paths",()=>{
  expect(resolvePreparedCardSample({plan:'pro',presentation:'custom',hasCustomPresentation:false}).sample).toBe('pro');
  for(const path of ['https://example.com','//evil.example','/app/prepared/test','/app/prepared/test/preview#fragment']) expect(()=>preparedCardSampleHrefs(path)).toThrow();
 });
 it("removes the custom presentation flag when returning to Free or Pro",()=>{
  const hrefs=preparedCardSampleHrefs('/app/prepared/example/preview?plan=pro&presentation=custom');
  expect(hrefs.free).toBe('/app/prepared/example/preview?plan=free');
  expect(hrefs.pro).toBe('/app/prepared/example/preview?plan=pro');
 });
});
