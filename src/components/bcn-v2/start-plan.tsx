"use client";
import { useState } from "react";
const prompts = [
  "Who do I want to help, and with what problem?",
  "What is the smallest useful thing I can offer?",
  "What will I test with a real potential customer?",
  "What will it cost in money and time?",
  "What help do I need from someone else?",
  "What will I do next, and by when?",
];
export function StartPlan() {
  const [answers, setAnswers] = useState<string[]>(prompts.map(() => ""));
  return (
    <section className="v2-card">
      <h2 style={{ fontSize: 28 }}>Make a small starting plan.</h2>
      <p>
        This stays in this browser tab. Save a text copy before leaving. It is a
        starting note, not a full business plan or funding application.
      </p>
      <div className="v2-form-grid">
        {prompts.map((p, i) => (
          <label className="v2-field" key={p}>
            {p}
            <textarea
              maxLength={1000}
              value={answers[i]}
              onChange={(e) =>
                setAnswers((a) =>
                  a.map((v, n) => (n === i ? e.target.value : v)),
                )
              }
            />
          </label>
        ))}
      </div>
      <button
        className="v2-button"
        style={{ marginTop: 20 }}
        type="button"
        onClick={() => {
          const text =
            "My business starting plan\nThe Business Circle\n\n" +
            prompts
              .map(
                (p, i) => p + "\n" + (answers[i] || "To work through") + "\n",
              )
              .join("\n");
          const url = URL.createObjectURL(
            new Blob([text], { type: "text/plain;charset=utf-8" }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = "my-business-starting-plan.txt";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Save my starting plan
      </button>
    </section>
  );
}
