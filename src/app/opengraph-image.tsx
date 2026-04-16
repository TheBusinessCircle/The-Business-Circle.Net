import { ImageResponse } from "next/og";
import { SITE_CONFIG } from "@/config/site";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";
export const alt = "The Business Circle Network";

const logoSrc = new URL(
  "/branding/the-business-circle-logo.png",
  SITE_CONFIG.url
).toString();

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #061533 0%, #0b1e3f 50%, #102b56 100%)",
          color: "#f4f7fb",
          padding: "56px",
          position: "relative"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 15% 20%, rgba(227, 178, 76, 0.20), rgba(227, 178, 76, 0) 40%), radial-gradient(circle at 85% 80%, rgba(227, 178, 76, 0.16), rgba(227, 178, 76, 0) 35%)"
          }}
        />

        <div
          style={{
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            maxWidth: "760px"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              border: "1px solid rgba(227, 178, 76, 0.45)",
              backgroundColor: "rgba(227, 178, 76, 0.14)",
              color: "#e3b24c",
              fontSize: 26,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: 999,
              padding: "8px 16px",
              width: "fit-content"
            }}
          >
            Private Founder Ecosystem
          </div>
          <h1
            style={{
              fontSize: 68,
              lineHeight: 1.05,
              margin: 0,
              fontWeight: 700
            }}
          >
            The Business Circle Network
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1.35,
              color: "#ced7e6"
            }}
          >
            Strategic resources, focused community, and accountable growth for serious founders.
          </p>
        </div>

        <img
          src={logoSrc}
          width={250}
          height={250}
          alt="The Business Circle Network logo"
          style={{
            zIndex: 1,
            borderRadius: "999px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
            border: "3px solid rgba(227, 178, 76, 0.35)"
          }}
        />
      </div>
    ),
    {
      ...size
    }
  );
}
