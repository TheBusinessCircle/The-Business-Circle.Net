import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/app/(public)/members/[memberId]/page.tsx"),
  "utf8"
);

describe("public member profile indexing", () => {
  it("keeps valid and missing member profiles out of search indexes", () => {
    const noIndexMatches = source.match(/index:\s*false/g) ?? [];
    const noFollowMatches = source.match(/follow:\s*false/g) ?? [];

    expect(noIndexMatches.length).toBeGreaterThanOrEqual(2);
    expect(noFollowMatches.length).toBeGreaterThanOrEqual(2);
  });
});
