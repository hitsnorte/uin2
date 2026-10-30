"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";

import { LuEye, LuEyeOff } from "react-icons/lu";

export default function Dashboard() {
  const { data: session } = useSession();
  const username = session?.user?.name || "Utilizador";

  const router = useRouter();
  
  const [showQR, setShowQR] = useState(false);
  
  const baseUrl =
  typeof window !== "undefined"
      ? window.location.origin + "/homepage"
      : "/homepage";
      
  const cards = [
    {
      title: "Linguagens",
      route: "backend/languages",
      color: "bg-blue-100 border-blue-400 hover:border-blue-500",
      showFrontend: true,
    },
    {
      title: "Personalizar",
      route: "backend/personalize",
      color: "bg-blue-100 border-blue-400 hover:border-blue-500",
      showFrontend: true,
    },
    {
      title: "Configurações",
      route: "backend/advancedConfigurations",
      color: "bg-blue-100 border-blue-400 hover:border-blue-500",
      showFrontend: false,
    },
    {
    title: "Areas",
    route: "backend/areas",
    color: "bg-green-100 border-green-400 hover:border-green-500",
    showFrontend: true,
  },
  {
    title: "Outlets",
    route: "backend/outlets",
    color: "bg-green-100 border-green-400 hover:border-green-500 ",
    showFrontend: true,
  },
  {
    title: "Menus",
    route: "backend/menus",
    color: "bg-green-100 border-green-400 hover:border-green-500 ",
    showFrontend: true,
  },
  {
    title: "Sub-Menus",
    route: "backend/submenus",
    color: "bg-green-100 border-green-400 hover:border-green-500 ",
    showFrontend: true,
  },
  {
    title: "Grupos de itens",
    route: "backend/productGroups",
    color: "bg-orange-100 border-orange-400 hover:border-orange-500",
    showFrontend: false,
  },
  {
    title: "Famílias de itens",
    route: "backend/productFamilies",
    color: "bg-orange-100 border-orange-400 hover:border-orange-500",
    showFrontend: false,
  },
  {
    title: "Categorias de itens",
    route: "backend/productCategories",
    color: "bg-orange-100 border-orange-400 hover:border-orange-500",
    showFrontend: false,
  },
  {
    title: "Itens",
    route: "backend/products",
    color: "bg-orange-100 border-orange-400 hover:border-orange-500",
    showFrontend: true,
  }
];

  function downloadQR() {
    const canvas = document.getElementById("qr-gen");
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = url;
    link.download = "qrcode-homepage.png";
    link.click();
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">

      {/* TOP BAR */}
      <Topbar title="Dashboard" />

      {/* MAIN */}
      <div className="relative z-10 flex items-center justify-center px-6 py-14">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 w-full max-w-6xl">

          {/* QR CARD */}
          <div
            onClick={() => setShowQR(true)}
            className="
              cursor-pointer
              bg-white
              border border-gray-200
              rounded-2xl
              shadow-lg
              h-48
              flex items-center justify-center
              text-center
              hover:shadow-2xl
              hover:border-red-300
              hover:-translate-y-1
              transition-all duration-200
            "
          >
            <div>
              <div className="text-gray-900 font-semibold text-lg">
                QRCode Universal
              </div>

              <div className="text-sm text-gray-500 mt-2">
                Gerar QR da homepage
              </div>
            </div>
          </div>

          {/* OTHER CARDS */}
          {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => router.push(`/${card.route}`)}
            className={`
              relative
              cursor-pointer
              rounded-2xl
              shadow-lg
              h-48
              flex items-center justify-center
              text-center
              hover:shadow-2xl
              hover:-translate-y-1
              transition-all duration-200
              ${card.color}
            `}
          >
            {/* Ícone canto superior direito */}
            <div className="absolute top-3 right-3 text-gray-400">
              {card.showFrontend ? (
                <LuEye size={25} />
              ) : (
                <LuEyeOff size={25} />
              )}
            </div>

            <div>
              <div className="text-gray-900 font-semibold text-lg">
                {card.title}
              </div>

              <div className="text-sm text-gray-500 mt-2">
                Abrir módulo
              </div>
            </div>
          </div>
        ))}

        </div>
      </div>

      {/* MODAL */}
      {showQR && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[320px] text-center">

            <h2 className="text-lg font-semibold mb-4">
              QR Code - Homepage
            </h2>

            <div className="flex justify-center mb-4">
              <QRCodeCanvas
                id="qr-gen"
                value={baseUrl}
                size={180}
              />
            </div>

            <div className="text-xs text-gray-500 break-all mb-4">
              {baseUrl}
            </div>

            <div className="flex gap-2 justify-center">

              <button
                onClick={() => setShowQR(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
              >
                Fechar
              </button>

              <button
                onClick={downloadQR}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
              >
                Download
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}