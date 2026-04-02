import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0F",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "999px",
            background: "#F59E0B",
          }}
        />
      </div>
    ),
    size,
  );
}
