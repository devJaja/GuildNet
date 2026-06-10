"use client";

import dynamic from "next/dynamic";

const PrivyProviderInner = dynamic(
  () => import("./providers-inner").then(m => m.ProvidersInner),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return <PrivyProviderInner>{children}</PrivyProviderInner>;
}
