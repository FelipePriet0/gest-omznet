"use client";

import Image from "next/image";
import { User } from "lucide-react";

interface SidebarUserProps {
  name?: string;
  email?: string;
  avatar?: string;
}

export const SidebarUser = ({ name = "Usuário", email, avatar }: SidebarUserProps) => {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
      <div className="h-8 w-8 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {avatar ? (
          <Image 
            src={avatar} 
            alt={name}
            width={32}
            height={32}
            className="object-cover"
          />
        ) : (
          <User className="h-4 w-4 text-white" />
        )}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-sm font-medium text-white truncate">
          {name}
        </span>
        {email && (
          <span className="text-xs text-white/80 truncate">
            {email}
          </span>
        )}
      </div>
    </div>
  );
};

