type VerifyEmailAddressEmailProps = {
  firstName: string;
  verificationUrl: string;
  logoUrl: string;
};

export function VerifyEmailAddressEmail({
  firstName,
  verificationUrl,
  logoUrl
}: VerifyEmailAddressEmailProps) {
  const previewText =
    "Confirm your email address to unlock your full Business Circle member access.";

  return (
    <div
      style={{
        margin: 0,
        padding: "32px 16px",
        backgroundColor: "#07111f",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          display: "none",
          overflow: "hidden",
          lineHeight: "1px",
          opacity: 0,
          maxHeight: 0,
          maxWidth: 0
        }}
      >
        {previewText}
      </div>
      <div
        style={{
          margin: "0 auto",
          maxWidth: "560px"
        }}
      >
        <div
          style={{
            marginBottom: "20px",
            textAlign: "center"
          }}
        >
          <img
            src={logoUrl}
            alt="The Business Circle Network"
            width="84"
            height="84"
            style={{
              display: "inline-block",
              width: "84px",
              height: "84px",
              borderRadius: "9999px",
              border: "1px solid rgba(209, 168, 97, 0.45)",
              backgroundColor: "#020817",
              objectFit: "contain"
            }}
          />
        </div>

        <div
          style={{
            borderRadius: "28px",
            border: "1px solid rgba(209, 168, 97, 0.22)",
            background:
              "linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(7, 17, 31, 0.98) 100%)",
            boxShadow: "0 24px 60px rgba(2, 6, 23, 0.45)",
            padding: "36px 28px"
          }}
        >
          <p
            style={{
              margin: "0 0 14px",
              color: "#d1a861",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textAlign: "center"
            }}
          >
            EMAIL VERIFICATION
          </p>

          <h1
            style={{
              margin: "0 0 14px",
              color: "#f8fafc",
              fontSize: "32px",
              fontWeight: 700,
              lineHeight: 1.15,
              textAlign: "center"
            }}
          >
            Confirm your email address
          </h1>

          <p
            style={{
              margin: "0 0 28px",
              color: "#94a3b8",
              fontSize: "16px",
              lineHeight: 1.65,
              textAlign: "center"
            }}
          >
            Hi {firstName}, you are one step away from full access to The Business Circle Network.
            Confirm your email address to unlock your member access and continue inside the platform.
          </p>

          <div style={{ marginBottom: "28px", textAlign: "center" }}>
            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                borderRadius: "9999px",
                backgroundColor: "#d1a861",
                color: "#07111f",
                fontSize: "16px",
                fontWeight: 700,
                lineHeight: 1,
                padding: "16px 28px",
                textDecoration: "none"
              }}
            >
              Verify your email
            </a>
          </div>

          <div
            style={{
              borderRadius: "20px",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              backgroundColor: "rgba(15, 23, 42, 0.7)",
              padding: "18px 18px 16px",
              marginBottom: "18px"
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                color: "#e2e8f0",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.08em"
              }}
            >
              If the button does not work
            </p>
            <p
              style={{
                margin: "0 0 10px",
                color: "#94a3b8",
                fontSize: "14px",
                lineHeight: 1.6
              }}
            >
              Copy and paste the link below into your browser.
            </p>
            <p
              style={{
                margin: 0,
                wordBreak: "break-all"
              }}
            >
              <a
                href={verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#d1a861",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  textDecoration: "underline"
                }}
              >
                {verificationUrl}
              </a>
            </p>
          </div>

          <p
            style={{
              margin: "0 0 6px",
              color: "#cbd5e1",
              fontSize: "13px",
              lineHeight: 1.6,
              textAlign: "center"
            }}
          >
            This verification link will expire automatically for your security.
          </p>
          <p
            style={{
              margin: "0 0 6px",
              color: "#cbd5e1",
              fontSize: "13px",
              lineHeight: 1.6,
              textAlign: "center"
            }}
          >
            For security, only the most recent verification email remains valid. Older links expire
            automatically.
          </p>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "12px",
              lineHeight: 1.6,
              textAlign: "center"
            }}
          >
            The Business Circle Network
          </p>
        </div>
      </div>
    </div>
  );
}
