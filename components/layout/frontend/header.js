"use client";

import { FiMenu } from "react-icons/fi";
import { FaHouse } from "react-icons/fa6";
import { CiUser } from "react-icons/ci";
import { IoIosLogOut } from "react-icons/io";
import { useTranslations } from "@/app/hooks/useTranslations";

export default function FrontendHeader({
  title,
  areas = [],
  outlets = [],
  personalize = {},
  menuOpen,
  setMenuOpen,
  openArea,
  setOpenArea,
  onHomeClick,
  onOutletClick,
  languages = [],
  selectedLang,
  onLanguageChange,
  isLoggedIn,
  currentUser,
  checkingSession,
  onLogout,
  onSignIn,
  onSignUp,
}) {
  const t = useTranslations();

  function getName(item, field) {
    return (
      item?.[`${field}${selectedLang}`] ||
      item?.[`${field}1`] ||
      item?.[`${field}2`] ||
      item?.[`${field}3`] ||
      item?.[`${field}4`] ||
      item?.[`${field}5`] ||
      ""
    );
  }

  function renderLanguageSelector() {
    return (
      <select
        value={selectedLang}
        onChange={(e) => onLanguageChange(Number(e.target.value))}
        className="w-full px-5 py-3 rounded-full font-medium backdrop-blur-xl border text-sm outline-none"
        style={{
          background: "rgba(255,255,255,0.25)",
          color: personalize?.foreground_color || "#111",
          borderColor: "rgba(255,255,255,0.3)",
        }}
      >
        {languages.map((lang) => (
          <option key={lang.lang_id} value={lang.lang_order}>
            {lang.lang_name}
          </option>
        ))}
      </select>
    );
  }

  function renderAuthActions() {
    if (checkingSession) {
      return (
        <div
          className="px-5 py-3 rounded-full font-medium backdrop-blur-xl border text-sm"
          style={{
            background: "rgba(255,255,255,0.25)",
            color: personalize?.foreground_color || "#111",
            borderColor: "rgba(255,255,255,0.3)",
          }}
        >
          ...
        </div>
      );
    }

    if (isLoggedIn) {
      return (
        <div className="flex items-center gap-2 sm:gap-3 justify-between">
          <div
            className="flex w-1/2 min-w-0 items-center gap-2 rounded-full border px-3 sm:px-4 py-3 font-medium text-xs sm:text-sm"
            style={{
              background: "rgba(255,255,255,0.25)",
              borderColor: "rgba(255,255,255,0.3)",
              color: personalize?.foreground_color || "#111",
            }}
          >
            <CiUser size={16} />
            <span className="truncate">{currentUser?.email || "Utilizador autenticado"}</span>
          </div>

          <div className="w-[110px] sm:w-[130px] shrink-0">
            {renderLanguageSelector()}
          </div>

          <button
            type="button"
            onClick={() => {
              onLogout?.();
              setMenuOpen(false);
            }}
            className="flex h-[48px] w-[48px] items-center justify-center rounded-full border transition-all duration-300 shadow-lg hover:scale-[1.02] active:scale-95"
            style={{
              background: "rgba(255,255,255,0.25)",
              borderColor: "rgba(255,255,255,0.3)",
              color: personalize?.icon_color || "#000000",
            }}
            title="Terminar sessão"
            aria-label="Terminar sessão"
          >
            <IoIosLogOut size={20} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => {
            onSignIn?.();
            setMenuOpen(false);
          }}
          className="flex-1 px-5 py-3 rounded-full font-medium backdrop-blur-xl border transition-all duration-300 shadow-lg hover:scale-[1.01] active:scale-95"
          style={{
            background: "rgba(255,255,255,0.25)",
            color: personalize?.foreground_color || "#111",
            borderColor: "rgba(255,255,255,0.3)",
          }}
        >
          {t.geral.signValues.signIn}
        </button>

        <button
          type="button"
          onClick={() => {
            onSignUp?.();
            setMenuOpen(false);
          }}
          className="flex-1 px-5 py-3 rounded-full font-medium transition-all duration-300 shadow-lg hover:scale-[1.01] active:scale-95"
          style={{
            background: personalize?.primary_color || "#ef4444",
            color: "#fff",
            borderColor: "transparent",
          }}
        >
          {t.geral.signValues.signUp}
        </button>
      </div>
    );
  }

  return (
    <div
      className="sticky top-0 z-50 mx-2 sm:mx-4 md:mx-[4vw] lg:mx-[8vw] xl:mx-[12vw] 2xl:mx-[15vw] border-b-2 rounded-b-2xl shadow-sm"
      style={{
        borderColor: personalize?.secondary_color
          ? `${personalize.secondary_color}cc`
          : "rgba(255,255,255,0.85)",
        color: personalize?.foreground_color || "#111",
        background: personalize?.background_color
          ? `${personalize.background_color}dd`
          : "rgba(255,255,255,0.9)",
      }}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-3">
        <div className="flex w-[70px] sm:w-[90px] lg:w-[120px] items-center justify-start">
          <button
            type="button"
            onClick={onHomeClick}
            className="text-2xl"
            aria-label="Voltar para a homepage"
          >
            <FaHouse size={45} color={personalize?.icon_color || "#000000"} />
          </button>
        </div>

        <div className="flex-1 text-center font-semibold tracking-wide">
          <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl leading-tight">{title}</p>
        </div>

        <div className="flex w-[70px] sm:w-[90px] lg:w-[120px] items-center justify-end">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="text-2xl"
            aria-label="Abrir menu"
          >
            <FiMenu size={50} color={personalize?.icon_color || "#000000"} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="w-full border-t px-3 sm:px-4 pb-4 pt-4"
          style={{
            borderColor: "rgba(0,0,0,0.1)",
            background: "rgba(255,255,255,0.12)",
            color: personalize?.foreground_color || "#111",
          }}
        >
          <div className="flex flex-col gap-4">
            {areas.length > 0 && (
              <div className="flex flex-col gap-1">
                {areas.map((area) => (
                  <div key={area.area_id}>
                    <div
                      onClick={() => {
                        setOpenArea(
                          openArea === area.area_id ? null : area.area_id
                        );
                      }}
                      className="flex justify-between items-center px-3 py-2 cursor-pointer transition hover:bg-black/5 rounded-lg"
                    >
                      <span className="font-medium text-sm sm:text-base">{getName(area, "area_name")}</span>
                      <span className="opacity-70">{openArea === area.area_id ? "−" : "+"}</span>
                    </div>

                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        openArea === area.area_id ? "max-h-96" : "max-h-0"
                      }`}
                    >
                      {outlets
                        .filter((outlet) => outlet.area_id === area.area_id)
                        .map((outlet) => (
                          <div
                            key={outlet.outlet_id}
                            onClick={() => {
                              onOutletClick?.(outlet.outlet_id);
                              setMenuOpen(false);
                            }}
                            className="px-5 py-2 text-xs sm:text-sm cursor-pointer transition hover:bg-black/5 rounded-lg"
                            style={{
                              color: personalize?.foreground_color || "#111",
                            }}
                          >
                            {getName(outlet, "outlet_name")}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
              {renderAuthActions()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
