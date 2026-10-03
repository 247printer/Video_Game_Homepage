"use client";

import { startTransition, type ComponentProps } from "react";
import { useRouter } from "next/navigation";

// Use the statically imported router: vinext's production Link loader loses
// navigation exports when its dynamic import is merged into the entry chunk.
export default function AppLink({ href, onClick, ...props }: ComponentProps<"a"> & { href: string }) {
  const router = useRouter();
  return <a {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.download !== undefined || (props.target && props.target !== "_self")) return;
    const destination = new URL(href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    event.preventDefault();
    startTransition(() => router.push(destination.pathname + destination.search + destination.hash));
  }} />;
}
