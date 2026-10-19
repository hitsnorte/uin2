"use client";

import { signOut, useSession } from "next-auth/react";

export default function Topbar({ title }) {
  const { data: session } = useSession();
  const username = session?.user?.name || "Utilizador";

  return (
    <div className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-xl shadow-sm">

      {/* LEFT */}
      <div className="text-lg font-semibold text-gray-800">
        {title}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {username}
        </span>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition shadow-sm"
        >
          Logout
        </button>
      </div>

    </div>
  );
}