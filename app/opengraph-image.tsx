import { ImageResponse } from "next/og";

export const alt = "Axon";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px",
          backgroundColor: "#0A0A0F",
          backgroundImage:
            "radial-gradient(circle at 78% 22%, rgba(99,102,241,0.22), rgba(10,10,15,0) 38%)",
          color: "#FAFAFA",
        }}
      >
        <div
          style={{
            fontSize: 108,
            fontWeight: 700,
            letterSpacing: "-0.04em",
          }}
        >
          AXON
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 36,
            lineHeight: 1.35,
            color: "#8A8A9A",
            maxWidth: 860,
          }}
        >
          AI Operations For Your Business
        </div>
      </div>
    ),
    size,
  );
}
