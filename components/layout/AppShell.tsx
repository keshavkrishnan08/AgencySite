import type { ReactNode } from "react";
import { AppNav } from "./AppNav";
import { AppSidebar } from "./AppSidebar";

/* Authed app chrome: a hover-expand sidebar on the left (lg+) plus a slim top
   bar. Content gets a fixed 76px left clearance for the collapsed rail; the
   rail expands over the page on hover, so content never reflows. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <AppSidebar />
      <div className="lg:pl-[76px]">
        <AppNav minimal />
        {children}
      </div>
    </>
  );
}
