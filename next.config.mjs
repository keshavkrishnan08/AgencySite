/** @type {import('next').NextConfig} */

// Baseline security headers applied to every response. These are the low-risk,
// high-value ones. A full Content-Security-Policy is intentionally left for a
// dedicated pass (it has to allowlist Stripe, Supabase, Mixpanel, and remote
// avatar images, and a wrong CSP takes the whole site down).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" }, // clickjacking
  { key: "X-Content-Type-Options", value: "nosniff" }, // MIME sniffing
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Lock down powerful features; the app needs the microphone (voice answers).
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(self), microphone=(self)" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // don't advertise the framework
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
