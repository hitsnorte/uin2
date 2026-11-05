"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";

export default function WithSidebarLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden bg-gray-50"
      style={{ "--sidebar-width": collapsed ? "5rem" : "16rem" }}
    >

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
        {children}
      </div>

    </div>
  );
}