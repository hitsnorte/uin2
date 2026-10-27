
"use client";

import { useRouter, usePathname } from "next/navigation";

export default function Sidebar({ collapsed, setCollapsed }) {
  const router = useRouter();
  const pathname = usePathname();

  const menu = [
    { name: "Dashboard", path: "/backend" },
    { name: "Linguagens", path: "/backend/languages" },
    { name: "Areas", path: "/backend/areas" },
    { name: "Outlets", path: "/backend/outlets" },
    { name: "Menus", path: "/backend/menus" },
    { name: "Submenus", path: "/backend/submenus" },
    { name: "Personalização", path: "/backend/personalize" },
    { name: "Grupos de itens", path: "/backend/productGroups" },
    { name: "Famílias de itens", path: "/backend/productFamilies" },
    { name: "Categorias de itens", path: "/backend/productCategories" },
    { name: "Itens", path: "/backend/products" },
    { name: "Grupos de preparação", path: "/backend/preparationGroups" },
    { name: "Preparações", path: "/backend/preparation" },
    { name: "Horários", path: "/backend/schedules" },
    { name: "Grupos de pontos de acesso", path: "/backend/accessPointGroups" },
    { name: "Subgrupos de pontos de acesso", path: "/backend/accessPointSubGroups" },
    { name: "Pontos de acesso", path: "/backend/accessPoints" },
    { name: "Tipologias", path: "/backend/typologies" },
    { name: "Pedidos", path: "/backend/orders" },
    {
      name: "Configurações",
      path: "/backend/advancedConfigurations",
    },
  ];

  return (
    <div
      className={`
        ${collapsed ? "w-20" : "w-64"}
        h-screen
        bg-white
        border-r border-gray-200
        shadow-sm
        transition-all
        duration-300
        flex
        flex-col
        overflow-hidden
        shrink-0
      `}
    >
      {/* HEADER */}
      <div
        className="
          h-17
          min-h-17
          shrink-0
          flex
          items-center
          justify-between
          px-4
          border-b
          border-gray-200
          bg-white
        "
      >
        {!collapsed && (
          <span className="text-lg font-semibold text-gray-800 tracking-tight">
            Backend
          </span>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="
            w-9
            h-9
            flex
            items-center
            justify-center
            rounded-lg
            hover:bg-red-50
            text-gray-500
            hover:text-red-600
            transition
          "
        >
          ☰
        </button>
      </div>

      {/* MENU */}
      <div
        className="
          flex-1
          min-h-0
          overflow-y-auto
          overflow-x-hidden
        "
      >
        <div className="flex flex-col gap-1 p-3">
          {menu.map((item) => {
            const active = pathname === item.path;

            return (
              <div
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`
                  group
                  flex
                  items-center
                  gap-3
                  px-4
                  py-3
                  rounded-xl
                  cursor-pointer
                  transition-all
                  duration-200

                  ${
                    active
                      ? "bg-red-50 text-red-600 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                {/* ÍCONE */}
                <div
                  className={`
                    w-8
                    h-8
                    shrink-0
                    flex
                    items-center
                    justify-center
                    rounded-lg

                    ${
                      active
                        ? "bg-red-100 text-red-600"
                        : "bg-gray-100 group-hover:bg-gray-200"
                    }

                    transition
                  `}
                >
                  •
                </div>

                {/* TEXTO */}
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
