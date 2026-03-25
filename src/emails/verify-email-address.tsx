type VerifyEmailAddressEmailProps = {
  firstName: string;
  verificationUrl: string;
};

export function VerifyEmailAddressEmail({
  firstName,
  verificationUrl
}: VerifyEmailAddressEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#0a1024", lineHeight: 1.5 }}>
      <h1>Verify your email address</h1>
      <p>Hi {firstName},</p>
      <p>Confirm your email to unlock community quality protections and full member trust features.</p>
      <p>
        Verify now:{" "}
        <a href={verificationUrl} target="_blank" rel="noopener noreferrer">
          {verificationUrl}
        </a>
      </p>
      <p>If you did not create this account, you can ignore this email.</p>
    </div>
  );
}
