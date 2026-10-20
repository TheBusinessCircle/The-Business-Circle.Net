import Link from "next/link";
import { notFound } from "next/navigation";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { requireUser } from "@/lib/session";
import { PageHeading } from "@/components/bcn-v2/shell";
import { IdeaBriefForm } from "@/components/bcn-v2/idea-client";
import { RulesChoice } from "@/components/bcn-v2/conversation-client";
import { hasAcceptedBcnRules } from "@/lib/rules-acceptance";
export const metadata = {
  title: "Ask for practical help | The Business Circle",
  robots: { index: false, follow: false },
};
export default async function NewIdea() {
  if (!isBcnV2Enabled()) notFound();
  const s = await requireUser({ allowUnentitled: true });
  const rules = await hasAcceptedBcnRules(s.user.id);
  return (
    <>
      <PageHeading
        eyebrow="BUILD IT TOGETHER"
        title="What would move your idea forward?"
      >
        <p>
          A clear, achievable ask gives someone a real way to help. Ask for
          time, skills, advice or an introduction. This section is not for
          raising money.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-prose">
          {!s.user.emailVerified ? (
            <p>
              Verify your email before posting.{" "}
              <Link href="/verify-email">Email verification help</Link>.
            </p>
          ) : !rules ? (
            <RulesChoice />
          ) : (
            <IdeaBriefForm />
          )}
        </div>
      </section>
    </>
  );
}
