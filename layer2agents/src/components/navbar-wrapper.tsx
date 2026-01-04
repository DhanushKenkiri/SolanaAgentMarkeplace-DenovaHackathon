"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";

// Pages where navbar should be hidden
const HIDE_NAVBAR_PATHS = ["/catalog"];

export function NavbarWrapper() {
  const pathname = usePathname();
  
  // Check if current path should hide navbar
  const shouldHideNavbar = HIDE_NAVBAR_PATHS.some(path => pathname.startsWith(path));
  
  if (shouldHideNavbar) {
    return null;
  }
  
  return <Navbar />;
}
