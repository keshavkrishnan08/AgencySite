import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Free Operations Audit — Axon",
  description:
    "Find out exactly where your service business is losing leads and wasting time. 30-minute audit. Free. No obligation.",
  openGraph: {
    title: "Free Operations Audit — Axon",
    description:
      "Find out exactly where your service business is losing leads and wasting time. 30-minute audit. Free. No obligation.",
  },
};

export default function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','YOUR_PIXEL_ID_HERE');
        fbq('track','PageView');
      `}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID_HERE&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>
      {children}
    </>
  );
}
