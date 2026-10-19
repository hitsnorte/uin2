"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";

export default function WithSidebarLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex-1 p-6">
        {children}
      </div>

    </div>
  );
}