import { describe, expect, it } from "vitest";
import {
  detectCircleCardFileKind,
  recommendedCircleCardFileAction
} from "@/lib/circle-card/file-actions";

describe("Circle Card document file detection", () => {
  it.each([
    ["guide.pdf", "PDF"],
    ["form.doc", "DOC"],
    ["form.docx", "DOCX"],
    ["prices.xls", "XLS"],
    ["prices.xlsx", "XLSX"],
    ["contacts.csv", "CSV"],
    ["terms.txt", "TXT"],
    ["menu.png", "PNG"],
    ["photo.jpg", "JPG"],
    ["catalogue.webp", "WEBP"]
  ])("detects %s as %s", (fileName, expected) => {
    expect(detectCircleCardFileKind({ fileName })).toBe(expected);
  });

  it("views browser-safe files and downloads office documents", () => {
    expect(recommendedCircleCardFileAction({ fileName: "guide.pdf" })).toBe("VIEW");
    expect(recommendedCircleCardFileAction({ fileName: "application.docx" })).toBe("DOWNLOAD");
  });
});
