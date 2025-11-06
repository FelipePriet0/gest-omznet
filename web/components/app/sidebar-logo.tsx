"use client";

import Link from "next/link";
import Image from "next/image";

export const Logo = () => {
  return (
    <Link
      href="/kanban"
      className="font-normal flex items-center text-sm py-1 relative z-20"
    >
      <Image 
        src="/mznet-logo.png" 
        alt="MZNET Logo" 
        width={32}
        height={32}
        className="flex-shrink-0 object-contain"
        priority
      />
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/kanban"
      className="font-normal flex items-center text-sm py-1 relative z-20"
    >
      <Image 
        src="/mznet-logo.png" 
        alt="MZNET Logo" 
        width={32}
        height={32}
        className="flex-shrink-0 object-contain"
        priority
      />
    </Link>
  );
};

