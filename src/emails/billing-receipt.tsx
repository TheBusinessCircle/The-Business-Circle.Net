type BillingReceiptEmailProps = {
  firstName: string;
  amount: string;
  planName: string;
};

export function BillingReceiptEmail({ firstName, amount, planName }: BillingReceiptEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#0a1024", lineHeight: 1.5 }}>
      <h1>Payment Receipt</h1>
      <p>Hi {firstName},</p>
      <p>We received your payment of {amount} for {planName}.</p>
      <p>Thank you for being part of The Business Circle Network.</p>
    </div>
  );
}