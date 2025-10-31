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
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
      <div className="h-8 w-8 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {avatar ? (
          <Image 
            src={avatar} 
            alt={name}
            width={32}
            height={32}
            className="object-cover"
          />
        ) : (
          <User className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
        )}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
          {name}
        </span>
        {email && (
          <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
            {email}
          </span>
        )}
      </div>
    </div>
  );
};

