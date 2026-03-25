type InnerCircleUpgradeEmailProps = {
  firstName: string;
};

export function InnerCircleUpgradeEmail({ firstName }: InnerCircleUpgradeEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#0a1024", lineHeight: 1.5 }}>
      <h1>Welcome to Inner Circle</h1>
      <p>Hi {firstName},</p>
      <p>Your Inner Circle upgrade is now active.</p>
      <p>You now have access to premium resources, private channels, and strategy call events.</p>
    </div>
  );
}