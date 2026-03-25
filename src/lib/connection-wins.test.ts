import { describe, expect, it } from "vitest";
import {
  CONNECTION_WIN_TAG,
  buildConnectionWinPreview,
  buildConnectionWinTitle,
  parseConnectionWin,
  serializeConnectionWin
} from "@/lib/connection-wins";

describe("connection wins helpers", () => {
  it("serializes and parses structured win content", () => {
    const content = serializeConnectionWin({
      whatHappened: "A member conversation turned into a focused introduction.",
      whoConnectedWith: "A service business owner in the Circle",
      whatChanged: "We clarified the offer and decided what to pitch first.",
      resultSoFar: "A proposal is now out with a much better fit than before."
    });

    const parsed = parseConnectionWin(content, [CONNECTION_WIN_TAG]);

    expect(parsed).toMatchObject({
      whatHappened: "A member conversation turned into a focused introduction.",
      whoConnectedWith: "A service business owner in the Circle",
      whatChanged: "We clarified the offer and decided what to pitch first.",
      resultSoFar: "A proposal is now out with a much better fit than before."
    });
    expect(parsed?.summary).toContain("proposal");
  });

  it("builds a useful preview and title from the strongest outcome", () => {
    const input = {
      whatHappened: "A member shared a useful perspective.",
      whoConnectedWith: "Another founder",
      whatChanged: "We changed the onboarding flow and removed the weak step.",
      resultSoFar: "Client responses are clearer and faster already."
    };

    const content = serializeConnectionWin(input);

    expect(buildConnectionWinTitle(input)).toContain("onboarding flow");
    expect(buildConnectionWinPreview(content, [CONNECTION_WIN_TAG])).toContain("Client responses");
  });
});
