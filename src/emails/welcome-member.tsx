import { MEMBERSHIP_PLANS } from "@/config/membership";

type WelcomeMemberEmailProps = {
  firstName: string;
  tier: keyof typeof MEMBERSHIP_PLANS;
};

export function WelcomeMemberEmail({ firstName, tier }: WelcomeMemberEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#0a1024", lineHeight: 1.5 }}>
      <h1>Welcome to The Business Circle Network</h1>
      <p>Hi {firstName},</p>
      <p>You are in the right place. Your membership tier is {MEMBERSHIP_PLANS[tier].name}.</p>
      <p>Log in to access your dashboard, resources, and community channels, then start with one clear move inside the platform.</p>
    </div>
  );
}
