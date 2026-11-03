"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LuChefHat,
  LuChevronDown,
  LuClipboardList,
  LuLayoutDashboard,
  LuMapPin,
  LuPanelsTopLeft,
  LuSettings,
  LuStore,
  LuUtensils,
} from "react-icons/lu";

const sidebarItems = [
  {
    name: "Dashboard",
    path: "/backend",
    icon: LuLayoutDashboard,
  },
  {
    name: "Estabelecimento",
    icon: LuStore,
    children: [
      { name: "Áreas", path: "/backend/areas" },
      { name: "Outlets", path: "/backend/outlets" },
      { name: "Horários", path: "/backend/schedules" },
      { name: "Tipologias", path: "/backend/typologies" },
    ],
  },
  {
    name: "Gestão de produtos",
    icon: LuUtensils,
    children: [
      { name: "Grupos de itens", path: "/backend/productGroups" },
      { name: "Famílias de itens", path: "/backend/productFamilies" },
      { name: "Categorias de itens", path: "/backend/productCategories" },
      { name: "Itens", path: "/backend/products" },
      { name: "Taxas de IVA", path: "/backend/ivaRates" },
    ],
  },
  {
    name: "Preparação",
    icon: LuChefHat,
    children: [
      { name: "Grupos de preparação", path: "/backend/preparationGroups" },
      { name: "Preparações", path: "/backend/preparation" },
    ],
  },
  {
    name: "Pontos de acesso",
    icon: LuMapPin,
    children: [
      { name: "Grupos de pontos de acesso", path: "/backend/accessPointGroups" },
      {
        name: "Subgrupos de pontos de acesso",
        path: "/backend/accessPointSubGroups",
      },
      { name: "Pontos de acesso", path: "/backend/accessPoints" },
    ],
  },
  {
    name: "Menus",
    icon: LuPanelsTopLeft,
    children: [
      { name: "Menus", path: "/backend/menus" },
      { name: "Submenus", path: "/backend/submenus" },
    ],
  },
  {
    name: "Operações",
    icon: LuClipboardList,
    children: [
      { name: "Pedidos", path: "/backend/orders" },
      { name: "Reservas", path: "/backend/reservations" },
    ],
  },
  {
    name: "Sistema",
    icon: LuSettings,
    children: [
      { name: "Personalização", path: "/backend/personalize" },
      { name: "Linguagens", path: "/backend/languages" },
      { name: "Configurações", path: "/backend/advancedConfigurations" },
    ],
  },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const activeGroup = sidebarItems.find((item) =>
      item.children?.some((child) => child.path === pathname)
    );
    return activeGroup ? [activeGroup.name] : [];
  });

  useEffect(() => {
    const activeGroup = sidebarItems.find((item) =>
      item.children?.some((child) => child.path === pathname)
    );
    if (activeGroup) {
      setExpandedGroups((groups) =>
        groups.includes(activeGroup.name) ? groups : [...groups, activeGroup.name]
      );
    }
  }, [pathname]);

  function toggleGroup(name) {
    if (collapsed) {
      setCollapsed(false);
      setExpandedGroups((groups) =>
        groups.includes(name) ? groups : [...groups, name]
      );
      return;
    }

    setExpandedGroups((groups) =>
      groups.includes(name)
        ? groups.filter((group) => group !== name)
        : [...groups, name]
    );
  }

  function navigate(path) {
    router.push(path);
  }

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-64"
      } flex h-screen shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white shadow-sm transition-all duration-300`}
    >
      <div className="flex h-17 min-h-17 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight text-gray-800">
            Backend
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      <nav
        aria-label="Navegação principal"
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3"
      >
        <div className="flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isPageActive = item.path === pathname;
            const isGroupActive = item.children?.some(
              (child) => child.path === pathname
            );
            const isExpanded = expandedGroups.includes(item.name);

            if (item.path) {
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-current={isPageActive ? "page" : undefined}
                  title={collapsed ? item.name : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    isPageActive
                      ? "bg-red-50 text-red-600 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    className={`h-5 w-5 shrink-0 ${
                      isPageActive
                        ? "text-red-600"
                        : "text-gray-500 group-hover:text-gray-700"
                    }`}
                  />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.name}</span>
                  )}
                </button>
              );
            }

            return (
              <div key={item.name}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.name)}
                  aria-expanded={!collapsed && isExpanded}
                  title={collapsed ? item.name : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    isGroupActive
                      ? "bg-red-50 text-red-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    className={`h-5 w-5 shrink-0 ${
                      isGroupActive
                        ? "text-red-600"
                        : "text-gray-500 group-hover:text-gray-700"
                    }`}
                  />
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 text-sm font-medium">
                        {item.name}
                      </span>
                      <LuChevronDown
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </button>

                {!collapsed && isExpanded && (
                  <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-gray-200 pl-3">
                    {item.children.map((child) => {
                      const isActive = pathname === child.path;

                      return (
                        <button
                          key={child.path}
                          type="button"
                          onClick={() => navigate(child.path)}
                          aria-current={isActive ? "page" : undefined}
                          className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                            isActive
                              ? "bg-red-50 font-medium text-red-600"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          {child.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
