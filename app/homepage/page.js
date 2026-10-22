"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiMenu } from "react-icons/fi";
import "./loading.css";
import { IoIosLogOut } from "react-icons/io";
import { CiUser } from "react-icons/ci";
// import de sign in/sign up
import SignUpModal from "@/components/sign/signUp";
import SignInModal from "@/components/sign/signIn";
import FrontendHeader from "@/components/layout/frontend/header";

import { useTranslations } from "@/app/hooks/useTranslations";

function isActive(value) {
  return value === true || value === 1 || value === "1";
}

function getRequestedId(searchParams, key) {
  if (!searchParams.has(key)) return null;

  const value = Number(searchParams.get(key));
  return Number.isInteger(value) && value > 0 ? value : NaN;
}

export default function Homepage() {
  const router = useRouter();
  const [areas, setAreas] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [menus, setMenus] = useState([]);
  const [submenus, setSubmenus] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [personalize, setPersonalize] = useState(null);
  const [selectedLang, setSelectedLang] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [openArea, setOpenArea] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedSubmenu, setSelectedSubmenu] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [email, setEmail] = useState("");

  const [sendingEmail, setSendingEmail] = useState(false);
  const [signupMessage, setSignupMessage] = useState("");
  const [signupError, setSignupError] = useState("");

  const [showSignInModal, setShowSignInModal] = useState(false);

  const [signInStep, setSignInStep] = useState("method");

  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [signingIn, setSigningIn] = useState(false);
  const [signInMessage, setSignInMessage] = useState("");
  const [signInError, setSignInError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const t = useTranslations();

  useEffect(() => {
    const savedLang = localStorage.getItem("lang");

    if (savedLang) {
      setSelectedLang(Number(savedLang));
    }

    // Permite o parametro "opensigninmodalaccesscode" na URL para abrir o modal de login diretamente no passo de código de acesso
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("opensigninmodalaccesscode")) {
      setSignInStep("code");
      setShowSignInModal(true);
    }

    fetchData();
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const response = await fetch("/api/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setIsLoggedIn(false);
        setCurrentUser(null);
        return;
      }

      const data = await response.json();

      setIsLoggedIn(Boolean(data?.authenticated));

      if (data?.authenticated && data?.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }

    } catch (error) {
      console.error("Erro ao verificar sessão:", error);

      setIsLoggedIn(false);
      setCurrentUser(null);

    } finally {
      setCheckingSession(false);
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Erro ao terminar sessão:", data.message);
        return;
      }

      setIsLoggedIn(false);
      setCurrentUser(null);
      setMenuOpen(false);
      setOpenArea(null);
      setSelectedArea(null);
      setSelectedOutlet(null);
      setSelectedMenu(null);
      setSelectedSubmenu(null);
      window.location.href = "/homepage";

    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
    }
  }
  async function fetchData() {
    setLoading(true);
    try {
      const [areasData, outletsData, menusData, submenusData, langs, pers] = await Promise.all(
        [
          "/api/areas",
          "/api/outlets",
          "/api/menus",
          "/api/submenus",
          "/api/languages",
          "/api/personalize",
        ].map(
          async (url) => {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Falha ao carregar ${url}: ${response.status}`);
            }
            return response.json();
          }
        )
      );

      if (
        !Array.isArray(areasData) ||
        !Array.isArray(outletsData) ||
        !Array.isArray(menusData) ||
        !Array.isArray(submenusData) ||
        !Array.isArray(langs)
      ) {
        throw new TypeError("As APIs de áreas, outlets, menus, submenus e idiomas devem devolver listas.");
      }

      const visibleAreas = areasData.filter((area) => isActive(area.visible));
      const visibleOutlets = outletsData.filter((outlet) => isActive(outlet.visible));
      const visibleMenus = menusData.filter((menu) => isActive(menu.visible));
      const visibleSubmenus = submenusData.filter((submenu) => isActive(submenu.visible));

      setAreas(visibleAreas);
      setOutlets(visibleOutlets);
      setMenus(visibleMenus);
      setSubmenus(visibleSubmenus);
      setLanguages(langs.sort((a, b) => a.lang_order - b.lang_order));
      setPersonalize(pers || null);

      const searchParams = new URLSearchParams(window.location.search);
      const requestedAreaId = getRequestedId(searchParams, "area_id");
      const requestedOutletId = getRequestedId(searchParams, "outlet_id");
      const requestedMenuId = getRequestedId(searchParams, "menu_id");
      const requestedSubmenuId = getRequestedId(searchParams, "submenu_id");
      const requestedAccessPointId = getRequestedId(searchParams, "access_point_id");
      const hasNavigationParams = [
        "area_id",
        "outlet_id",
        "menu_id",
        "submenu_id",
        "access_point_id",
      ].some((key) => searchParams.has(key));

      const isInvalidId = [
        requestedAreaId,
        requestedOutletId,
        requestedMenuId,
        requestedSubmenuId,
        requestedAccessPointId,
      ].some((id) => Number.isNaN(id));
      const requestedSubmenu = requestedSubmenuId
        ? visibleSubmenus.find(
            (item) => Number(item.submenu_id) === requestedSubmenuId
          )
        : null;
      const requestedMenu = requestedMenuId
        ? visibleMenus.find((item) => Number(item.menu_id) === requestedMenuId)
        : requestedSubmenu
          ? visibleMenus.find(
              (item) => Number(item.menu_id) === Number(requestedSubmenu.menu_id)
            )
          : null;
      const requestedOutlet = requestedOutletId
        ? visibleOutlets.find(
            (item) => Number(item.outlet_id) === requestedOutletId
          )
        : requestedMenu
          ? visibleOutlets.find(
              (item) => Number(item.outlet_id) === Number(requestedMenu.outlet_id)
            )
          : null;
      const requestedArea = requestedAreaId
        ? visibleAreas.find((item) => Number(item.area_id) === requestedAreaId)
        : requestedOutlet
          ? visibleAreas.find(
              (item) => Number(item.area_id) === Number(requestedOutlet.area_id)
            )
          : null;

      let hasValidPath =
        !isInvalidId &&
        (!searchParams.has("area_id") || Boolean(requestedArea)) &&
        (!searchParams.has("outlet_id") || Boolean(requestedOutlet)) &&
        (!searchParams.has("menu_id") || Boolean(requestedMenu)) &&
        (!searchParams.has("submenu_id") || Boolean(requestedSubmenu)) &&
        (!searchParams.has("access_point_id") || Boolean(requestedAccessPointId));

      if (hasValidPath && requestedOutlet) {
        hasValidPath = Boolean(requestedArea);
      }

      if (hasValidPath && requestedMenu) {
        hasValidPath =
          Number(requestedMenu.outlet_id) === Number(requestedOutlet?.outlet_id) &&
          Boolean(requestedArea);
      }

      if (hasValidPath && requestedSubmenu) {
        hasValidPath =
          Number(requestedSubmenu.menu_id) === Number(requestedMenu?.menu_id) &&
          isActive(requestedMenu?.has_submenus);
      }

      if (hasValidPath && requestedArea && requestedOutlet) {
        hasValidPath =
          Number(requestedOutlet.area_id) === Number(requestedArea.area_id);
      }

      if (hasValidPath && requestedAccessPointId) {
        if (!requestedOutlet) {
          hasValidPath = false;
        } else {
          const accessPointsResponse = await fetch(
            `/api/outlets/${requestedOutlet.outlet_id}/access-points`
          );
          if (!accessPointsResponse.ok) {
            throw new Error(
              `Falha ao validar o ponto de acesso: ${accessPointsResponse.status}`
            );
          }

          const accessPointLayout = await accessPointsResponse.json();
          hasValidPath = Array.isArray(accessPointLayout.rooms) &&
            accessPointLayout.rooms.some((room) =>
              Array.isArray(room.points) &&
              room.points.some(
                (point) =>
                  Number(point.access_point_id) === requestedAccessPointId &&
                  isActive(point.active)
              )
            );
        }
      }

      if (hasNavigationParams && !hasValidPath) {
        setSelectedSubmenu(null);
        setSelectedMenu(null);
        setSelectedOutlet(null);
        setSelectedArea(null);
        setOpenArea(null);
        setMenuOpen(false);
        router.replace("/homepage");
        return;
      }

      const submenu = requestedSubmenu;
      const menu = requestedMenu;
      const outlet = requestedOutlet;
      const area = requestedArea;

      setSelectedSubmenu(submenu?.submenu_id ?? null);
      setSelectedMenu(menu?.menu_id ?? null);
      setSelectedOutlet(outlet?.outlet_id ?? null);
      setSelectedArea(area?.area_id ?? null);
      setOpenArea(area?.area_id ?? null);
      setMenuOpen(Boolean(area && !outlet) && pers?.page_model === 1);
    } catch (error) {
      console.error("Erro ao carregar os dados da homepage:", error);
    } finally {
      setLoading(false);
    }
  }

  function changeLang(order) {
    setSelectedLang(order);
    localStorage.setItem("lang", order);

    window.dispatchEvent(new Event("languageChanged"));
  }

  function renderLanguageSelector(variant = "default") {
    const activeLanguage = languages.find((lang) => lang.lang_order === selectedLang);

    if (variant === "compact") {
      return (
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => setLanguageMenuOpen((prev) => !prev)}
            className="min-w-[96px] sm:min-w-[110px] px-3 py-2 sm:px-5 sm:py-3 rounded-full text-xs sm:text-sm font-medium backdrop-blur-xl border transition-all duration-200 ease-out shadow-lg hover:scale-[1.02] active:scale-95"
            style={{
              background: "rgba(255,255,255,0.25)",
              color: theme.text,
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            {activeLanguage?.lang_name || "Idioma"}
          </button>

          {languageMenuOpen && (
            <div
              className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[140px] rounded-2xl border shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-200 ease-out origin-top"
              style={{
                background: "rgba(255,255,255,0.92)",
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <div className="max-h-52 overflow-y-auto">
                {languages.map((lang) => {
                  const isActive = selectedLang === lang.lang_order;

                  return (
                    <button
                      key={lang.lang_id}
                      type="button"
                      onClick={() => {
                        changeLang(lang.lang_order);
                        setLanguageMenuOpen(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-xs sm:text-sm font-medium transition-colors duration-150"
                      style={{
                        background: isActive ? "rgba(0,0,0,0.05)" : "transparent",
                        color: theme.text,
                      }}
                    >
                      {lang.lang_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    const selectClass =
      "px-11 py-5 rounded-full text-sm font-medium backdrop-blur-xl border transition-all duration-300 shadow-lg hover:scale-110 active:scale-95";

    return (
      <select
        value={selectedLang}
        onChange={(e) => changeLang(Number(e.target.value))}
        className={selectClass}
        style={{
          background: personalize?.primary_color || "#ef4444",
          color: "#fff",
          borderColor: "transparent",
          boxShadow: `0 8px 25px ${personalize?.primary_color || "#ef4444"}55`,
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

  function renderLanguageSwitcher() {
    const activeLanguage = languages.find((lang) => lang.lang_order === selectedLang);

    return (
      <>
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex flex-wrap gap-10 justify-center">
          {languages.map((lang) => {
            const isActive = selectedLang === lang.lang_order;

            return (
              <button
                key={lang.lang_id}
                onClick={() => changeLang(lang.lang_order)}
                className="px-11 py-5 rounded-full text-sm font-medium backdrop-blur-xl border transition-all duration-300 shadow-lg hover:scale-110 active:scale-95"
                style={{
                  background: isActive
                    ? personalize?.primary_color || "#ef4444"
                    : "rgba(255,255,255,0.25)",
                  color: isActive
                    ? "#fff"
                    : personalize?.foreground_color || "#111",
                  borderColor: isActive
                    ? "transparent"
                    : "rgba(255,255,255,0.3)",
                  boxShadow: isActive
                    ? `0 8px 25px ${personalize?.primary_color || "#ef4444"}55`
                    : "0 4px 15px rgba(0,0,0,0.15)",
                }}
              >
                {lang.lang_name}
              </button>
            );
          })}
        </div>

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(80vw,280px)] md:hidden">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLanguageMenuOpen((prev) => !prev)}
              className="w-full rounded-full px-5 py-3 text-sm font-medium border shadow-lg outline-none"
              style={{
                background: personalize?.primary_color || "#ef4444",
                color: "#fff",
                borderColor: "transparent",
                boxShadow: `0 8px 25px ${personalize?.primary_color || "#ef4444"}55`,
              }}
            >
              {activeLanguage?.lang_name || "Idioma"}
            </button>

            {languageMenuOpen && (
              <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 rounded-2xl border shadow-2xl backdrop-blur-xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  borderColor: "rgba(255,255,255,0.3)",
                }}
              >
                <div className="max-h-52 overflow-y-auto">
                  {languages.map((lang) => {
                    const isActive = selectedLang === lang.lang_order;

                    return (
                      <button
                        key={lang.lang_id}
                        type="button"
                        onClick={() => {
                          changeLang(lang.lang_order);
                          setLanguageMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium transition-colors"
                        style={{
                          background: isActive ? "rgba(0,0,0,0.05)" : "transparent",
                          color: personalize?.foreground_color || "#111",
                        }}
                      >
                        {lang.lang_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
  
  function getName(obj, prefix) {
    return obj?.[`${prefix}${selectedLang}`] || "—";
  }

  function getAreaOutlets(areaId) {
    return outlets.filter((outlet) => Number(outlet.area_id) === Number(areaId));
  }

  function getOutletMenus(outletId) {
    return menus.filter((menu) => Number(menu.outlet_id) === Number(outletId));
  }

   function getMenuSubmenus(menuId) {
    const menuSubmenus = submenus.filter(
      (submenu) => Number(submenu.menu_id) === Number(menuId)
    );

    return selectedSubmenu === null
      ? menuSubmenus
      : menuSubmenus.filter((submenu) => submenu.submenu_id === selectedSubmenu);
  }

  function openMenuContent(menu) {
    router.push(`/homepage/outlet/menu-${menu.menu_id}`);
  }

  function openSubmenuContent(submenu) {
    router.push(`/homepage/outlet/submenu-${submenu.submenu_id}`);
  }

  function openMenuContent(menu) {
    router.push(`/homepage/outlet/menu-${menu.menu_id}`);
  }

  function openSubmenuContent(submenu) {
    router.push(`/homepage/outlet/submenu-${submenu.submenu_id}`);
  }

  const theme = {
    primary: personalize?.primary_color || "#ef4444",
    secondary: personalize?.secondary_color || "#000000",
    background: personalize?.background_color || "#ffffff",
    text: personalize?.foreground_color || "#000000",
    cardColors: personalize?.card_colors || [],
    bgImage: personalize?.background_image || null,
    logoImage: personalize?.logo || null,
    mode: personalize?.page_model || 1,
    icon: personalize?.icon_color || "#000000",
    cardTextFont: personalize?.card_text_font || "Arial",
    cardTextColor: personalize?.card_text_color || "#000000",
    cardTextSize: Number(personalize?.card_text_size || 16),
  };

  function chunk(arr, pattern = [2, 3]) {
    const res = [];
    let i = 0;
    let p = 0;

    while (i < arr.length) {
      const size = pattern[p % pattern.length];
      res.push(arr.slice(i, i + size));
      i += size;
      p++;
    }

    return res;
  }

  function getCardColor(i) {
    if (theme.cardColors.length > 0) {
      return theme.cardColors[i % theme.cardColors.length];
    }

    const fallback = [
      "#111827",
      "#1f2937",
      "#374151",
      "#dc2626",
      "#b91c1c",
      "#0f172a",
    ];

    return fallback[i % fallback.length];
  }

  async function handleSignUp() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setSignupError("Introduza o seu email.");
      return;
    }

    setSendingEmail(true);
    setSignupError("");
    setSignupMessage("");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSignupError(
          data.message || t.geral.signValues.messages.error.accessCodeSent
        );

        return;
      }

      setSignupMessage(
        t.geral.signValues.messages.success.accessCodeSent
      );

      setEmail("");

      setTimeout(() => {
        setShowSignUpModal(false);
        setSignupMessage("");
      }, 2500);

    } catch (error) {
      console.error(error);

      setSignupError(
        t.geral.signValues.messages.error.serverCommunication
      );
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleSignIn() {
    setSignInError("");
    setSignInMessage("");

    // =========================
    // LOGIN COM EMAIL + PASSWORD
    // =========================

      if (signInStep === "login") {
      const cleanEmail = loginEmail.trim().toLowerCase();

      if (!cleanEmail) {
        setSignInError(t.geral.signValues.messages.error.emailRequired);
        return;
      }

      if (!loginPassword) {
        setSignInError(t.geral.signValues.messages.error.passwordRequired);
        return;
      }

      setSigningIn(true);

      try {
        const response = await fetch("/api/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: cleanEmail,
            password: loginPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setSignInError(
            data.message || t.geral.signValues.messages.error.invalidCredentials
          );
          return;
        }

          await checkSession();
        setSignInMessage(t.geral.signValues.messages.success.signInSuccess);

        setTimeout(() => {
          setShowSignInModal(false);
          setSignInStep("method");

          setLoginEmail("");
          setLoginPassword("");

          setSignInMessage("");
        }, 1000);

      } catch (error) {
        console.error(error);

        setSignInError(
          t.geral.signValues.messages.error.serverCommunication
        );
      } finally {
        setSigningIn(false);
      }

      return;
    }

    // =========================
    // PASSO 1 - VALIDAR CÓDIGO
    // =========================

    if (signInStep === "code") {
      if (accessCode.length !== 6) {
        setSignInError(t.geral.signValues.messages.error.invalidAccessCode);
        return;
      }

      setSigningIn(true);

      try {
        const response = await fetch("/api/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: accessCode,
          }),
        });

        const data = await response.json();

        if (data?.step === "account_setup") {
          setSignInStep("account_setup");
          setLoginEmail("");
          setLoginPassword("");
          setPassword("");
          setConfirmPassword("");
          setSignInMessage(
            data.message || "Este código está incompleto. Introduza o email e a password."
          );
          return;
        }

        if (!response.ok || !data.success) {
          setSignInError(
            data.message || t.geral.signValues.messages.error.invalidAccessCode
          );
          return;
        }

        setSignInMessage(t.geral.signValues.messages.success.validAccessCode);

        setTimeout(() => {
          setSignInMessage("");
          setSignInStep("password");
        }, 500);

      } catch (error) {
        console.error(error);

        setSignInError(
          t.geral.signValues.messages.error.serverCommunication
        );
      } finally {
        setSigningIn(false);
      }

      return;
    }

    // =========================
    // PASSO 2 - DEFINIR PASSWORD
    // =========================

    if (signInStep === "account_setup") {
      const cleanEmail = loginEmail.trim().toLowerCase();

      if (!cleanEmail) {
        setSignInError(t.geral.signValues.messages.error.emailRequired);
        return;
      }

      if (!password) {
        setSignInError(t.geral.signValues.messages.error.passwordRequired);
        return;
      }

      if (password.length < 8) {
        setSignInError(
          t.geral.signValues.messages.error.passwordTooShort
        );
        return;
      }

      if (password !== confirmPassword) {
        setSignInError(
          t.geral.signValues.messages.error.passwordsDoNotMatch
        );
        return;
      }

      setSigningIn(true);

      try {
        const response = await fetch("/api/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            code: accessCode,
            email: cleanEmail,
            password: password,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setSignInError(
            data.message ||
            t.geral.signValues.messages.error.passwordSetFailed
          );
          return;
        }

          await checkSession();
        setSignInMessage(
          data.message || t.geral.signValues.messages.success.passwordSet
        );

        setTimeout(() => {
          setShowSignInModal(false);

          setSignInStep("method");
          setAccessCode("");
          setPassword("");
          setConfirmPassword("");
          setLoginEmail("");
          setLoginPassword("");
          setSignInMessage("");
        }, 1500);

      } catch (error) {
        console.error(error);

        setSignInError(
          t.geral.signInErrors.messages.error.serverCommunication
        );
      } finally {
        setSigningIn(false);
      }

      return;
    }

    if (signInStep === "password") {
      if (!password) {
        setSignInError(t.geral.signValues.messages.error.passwordRequired);
        return;
      }

      if (password.length < 8) {
        setSignInError(
          t.geral.signValues.messages.error.passwordTooShort
        );
        return;
      }

      if (password !== confirmPassword) {
        setSignInError(
          t.geral.signValues.messages.error.passwordsDoNotMatch
        );
        return;
      }

      setSigningIn(true);

      try {
        const response = await fetch("/api/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: accessCode,
            password: password,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setSignInError(
            data.message ||
            t.geral.signValues.messages.error.passwordSetFailed
          );
          return;
        }
        await checkSession();
        setSignInMessage(
          t.geral.signValues.messages.success.passwordSet
        );

        setTimeout(() => {
          setShowSignInModal(false);

          setSignInStep("method");
          setAccessCode("");
          setPassword("");
          setConfirmPassword("");
          setSignInMessage("");
        }, 1500);

      } catch (error) {
        console.error(error);

        setSignInError(
          t.geral.signInErrors.messages.error.serverCommunication
        );
      } finally {
        setSigningIn(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay flex flex-col items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }
  if (theme.mode === 2) {
    const data = selectedMenu !== null
      ? getMenuSubmenus(selectedMenu)
      : selectedOutlet !== null
        ? getOutletMenus(selectedOutlet)
        : selectedArea !== null
          ? getAreaOutlets(selectedArea)
          : areas;
    const cardNamePrefix = selectedMenu !== null
      ? "submenu_name"
      : selectedOutlet !== null
        ? "menu_name"
        : selectedArea !== null
          ? "outlet_name"
          : "area_name";
    const cardBackgroundField = selectedMenu !== null
      ? "submenu_card_background"
      : selectedOutlet !== null
        ? "menu_card_background"
        : selectedArea !== null
          ? "outlet_card_background"
          : "area_card_background";
    const cardIdField = selectedMenu !== null
      ? "submenu_id"
      : selectedOutlet !== null
        ? "menu_id"
        : selectedArea !== null
          ? "outlet_id"
          : "area_id";
    const rows = chunk(data, [2, 3]);

    return (
      <div
        className="w-full min-h-screen overflow-hidden relative"
        style={{ background: theme.background, color: theme.text }}
      >

        {selectedArea !== null && (
          <button
            onClick={() => {
              if (selectedMenu !== null) {
                if (selectedSubmenu !== null) {
                  setSelectedSubmenu(null);
                  return;
                }
                setSelectedMenu(null);
              } else if (selectedOutlet !== null) {
                setSelectedOutlet(null);
              } else {
                setSelectedArea(null);
                setSelectedOutlet(null);
                setSelectedMenu(null);
              }
            }}
            className="absolute top-4 left-4 z-50 px-4 py-2 rounded-lg shadow-lg"
            style={{ background: theme.primary, color: theme.text }}
          >
            ← {t.geral.buttons.back}
          </button>
        )}

        <div className="w-full min-h-full p-4 pb-28 md:pb-8">
          <div className="fixed top-6 left-0 right-0 z-50 flex items-center justify-end gap-2 px-4 sm:gap-4 sm:left-auto sm:right-6 sm:translate-x-0 sm:px-0">
            {checkingSession ? (
              <div
                className="px-5 py-3 rounded-full font-medium backdrop-blur-xl"
                style={{
                  color: theme.text,
                }}
              >
                ...
              </div>
            ) : isLoggedIn ? (
              <div className="flex items-center justify-end gap-2 sm:gap-3">

                <div
                  className="px-3 py-2 sm:px-5 sm:py-3 rounded-full font-medium backdrop-blur-xl border max-w-[42vw] sm:max-w-none"
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    color: theme.text,
                    borderColor: "rgba(255,255,255.0.3)",
                  }}
                >
                  <span className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-0">
                    <CiUser size={18} className="shrink-0 sm:size-5" />
                    <span className="truncate text-xs sm:text-sm">
                      {(currentUser?.email || "Utilizador autenticado").split("@")[0]}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-center">
                  {renderLanguageSelector("compact")}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-2 sm:px-5 sm:py-3 rounded-full font-medium backdrop-blur-xl border transition-all duration-300 shadow-lg hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    color: theme.text,
                    borderColor: "rgba(255,255,255,0.3)",
                  }}
                >
                  <IoIosLogOut size={18} className="sm:size-5" />
                </button>

              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignInModal(true);
                    setSignInStep("method");
                    setSignInError("");
                    setSignInMessage("");
                  }}
                  className="px-5 py-3 rounded-full font-medium backdrop-blur-xl border transition-all duration-300 shadow-lg hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    color: theme.text,
                    borderColor: "rgba(255,255,255,0.3)",
                  }}
                >
                  {t.geral.signValues.signIn}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSignUpModal(true)}
                  className="px-5 py-3 rounded-full font-medium transition-all duration-300 shadow-lg hover:scale-105 active:scale-95"
                  style={{
                    background: theme.primary,
                    color: "#fff",
                    borderColor: "transparent",
                  }}
                >
                  {t.geral.signValues.signUp}
                </button>
              </>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {data.length === 0 && (
              <p className="py-12 text-center opacity-70">
                Não existem itens associados.
              </p>
            )}
            {rows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={
                  row.length === 2
                    ? "grid gap-4 grid-cols-1 sm:grid-cols-2"
                    : "grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                }
              >
                {row.map((item, i) => (
                  <div
                    key={`${cardIdField}-${item[cardIdField] ?? i}`}
                    onClick={() => {
                      if (selectedMenu !== null) {
                        openSubmenuContent(item);
                        return;
                      }
                      if (selectedOutlet !== null) {
                        if (item.has_submenus === false) {
                          openMenuContent(item);
                        } else {
                          setSelectedMenu(item.menu_id);
                        setSelectedSubmenu(null);
                        }
                      } else if (selectedArea !== null) {
                        setSelectedOutlet(item.outlet_id);
                        setSelectedMenu(null);
                        setSelectedSubmenu(null);
                      } else {
                        setSelectedArea(item.area_id);
                        setSelectedOutlet(null);
                        setSelectedMenu(null);
                        setSelectedSubmenu(null);
                      }
                    }}
                    className="w-full min-h-[45vh] sm:min-h-0 sm:aspect-[4/3] rounded-2xl flex items-center justify-center font-semibold cursor-pointer hover:scale-[1.02] transition overflow-hidden"
                    style={{
                      background: getCardColor(rowIndex * 10 + i),
                      backgroundImage: `url("${encodeURI(
                        item[cardBackgroundField] || ""
                      )
                        }")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      fontFamily: theme.cardTextFont,
                    }}
                  >
                    <div
                      className="px-3 text-center bg-white/50 rounded-lg py-1 backdrop-blur-[1px]"
                      style={{
                        color: theme.cardTextColor,
                        fontSize: `${theme.cardTextSize}px`
                      }}
                    >
                      {getName(item, cardNamePrefix)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {!checkingSession && !isLoggedIn && renderLanguageSwitcher()}
        <SignUpModal
          showSignUpModal={showSignUpModal}
          setShowSignUpModal={setShowSignUpModal}
          email={email}
          setEmail={setEmail}
          theme={theme}
          handleSignUp={handleSignUp}
          sendingEmail={sendingEmail}
          signupMessage={signupMessage}
          signupError={signupError}
          acceptedPrivacy={acceptedPrivacy}
          setAcceptedPrivacy={setAcceptedPrivacy}
        />

        <SignInModal
          showSignInModal={showSignInModal}
          setShowSignInModal={setShowSignInModal}
          theme={theme}

          signInStep={signInStep}
          setSignInStep={setSignInStep}

          accessCode={accessCode}
          setAccessCode={setAccessCode}

          password={password}
          setPassword={setPassword}

          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}

          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}

          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}

          handleSignIn={handleSignIn}
          signingIn={signingIn}
          signInMessage={signInMessage}
          signInError={signInError}
        />
      </div>
    );
  }

  if (theme.mode === 1) {
    const selectedOutletData = outlets.find(
      (outlet) => Number(outlet.outlet_id) === Number(selectedOutlet)
    );
    const levelItems = selectedMenu !== null
      ? getMenuSubmenus(selectedMenu)
      : selectedOutlet !== null
        ? getOutletMenus(selectedOutlet)
        : [];
    const levelNamePrefix = selectedMenu !== null ? "submenu_name" : "menu_name";
    const levelBackgroundField = selectedMenu !== null
      ? "submenu_card_background"
      : "menu_card_background";
    const levelIdField = selectedMenu !== null ? "submenu_id" : "menu_id";
    const levelRows = chunk(levelItems, [2, 3]);

    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          backgroundColor: personalize?.background_color || "#f3f4f6",
          backgroundImage: personalize?.background_image
            ? `url(${encodeURI(personalize.background_image)})`
            : "none",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "50vw 50vh",
        }}
      >
        <FrontendHeader
          title={personalize?.bar_text || "Bem vindo!"}
          areas={areas}
          outlets={outlets}
          personalize={personalize}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          openArea={openArea}
          setOpenArea={setOpenArea}
          onHomeClick={() => {
            setSelectedOutlet(null);
            setSelectedMenu(null);
            setSelectedSubmenu(null);
            setOpenArea(null);
            setMenuOpen(false);
            window.location.href = "/homepage";
          }}
          onOutletClick={(outletId) => {
            setSelectedOutlet(outletId);
            setSelectedMenu(null);
            setSelectedSubmenu(null);
          }}
          languages={languages}
          selectedLang={selectedLang}
          onLanguageChange={changeLang}
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          checkingSession={checkingSession}
          onLogout={handleLogout}
          onSignIn={() => {
            setShowSignInModal(true);
            setSignInStep("method");
            setSignInError("");
            setSignInMessage("");
            setMenuOpen(false);
          }}
          onSignUp={() => {
            setShowSignUpModal(true);
            setSignupError("");
            setSignupMessage("");
            setMenuOpen(false);
          }}
        />

        <div className="flex-1 p-6">
          {selectedOutlet !== null && (
            <div className="mx-auto max-w-6xl">
              <button
                type="button"
                onClick={() => {
                  if (selectedSubmenu !== null) {
                    setSelectedSubmenu(null);
                    return;
                  }
                  if (selectedMenu !== null) {
                    setSelectedMenu(null);
                    return;
                  }

                  setSelectedOutlet(null);
                  setMenuOpen(true);
                  setOpenArea(selectedOutletData?.area_id ?? null);
                }}
                className="mb-6 px-4 py-2 rounded-lg shadow-lg"
                style={{ background: theme.primary, color: "#fff" }}
              >
                ← {t.geral.buttons.back}
              </button>

              {levelItems.length === 0 ? (
                <p className="py-12 text-center opacity-70" style={{ color: theme.text }}>
                  Não existem itens associados.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {levelRows.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className={
                        row.length === 2
                          ? "grid gap-4 grid-cols-1 sm:grid-cols-2"
                          : "grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                      }
                    >
                      {row.map((item, itemIndex) => (
                        <button
                          key={`${levelIdField}-${item[levelIdField] ?? itemIndex}`}
                          type="button"
                          onClick={() => {
                            if (selectedMenu === null) {
                              if (item.has_submenus === false) {
                                openMenuContent(item);
                              } else {
                                setSelectedMenu(item.menu_id);
                                setSelectedSubmenu(null);
                            }
                            } else {
                              openSubmenuContent(item);
                            }
                          }}
                          className="w-full min-h-[30vh] sm:aspect-[4/3] rounded-2xl flex items-center justify-center font-semibold transition overflow-hidden cursor-pointer hover:scale-[1.02]"
                          style={{
                            background: getCardColor(rowIndex * 10 + itemIndex),
                            backgroundImage: `url("${encodeURI(item[levelBackgroundField] || "")}")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            fontFamily: theme.cardTextFont,
                          }}
                        >
                          <span
                            className="px-3 text-center bg-white/50 rounded-lg py-1 backdrop-blur-[1px]"
                            style={{
                              color: theme.cardTextColor,
                              fontSize: `${theme.cardTextSize}px`,
                            }}
                          >
                            {getName(item, levelNamePrefix)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!checkingSession && !isLoggedIn && renderLanguageSwitcher()}
        <SignUpModal
          showSignUpModal={showSignUpModal}
          setShowSignUpModal={setShowSignUpModal}
          email={email}
          setEmail={setEmail}
          theme={theme}
          handleSignUp={handleSignUp}
          sendingEmail={sendingEmail}
          signupMessage={signupMessage}
          signupError={signupError}
          acceptedPrivacy={acceptedPrivacy}
          setAcceptedPrivacy={setAcceptedPrivacy}
        />

        <SignInModal
          showSignInModal={showSignInModal}
          setShowSignInModal={setShowSignInModal}
          theme={theme}

          signInStep={signInStep}
          setSignInStep={setSignInStep}

          accessCode={accessCode}
          setAccessCode={setAccessCode}

          password={password}
          setPassword={setPassword}

          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}

          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}

          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}

          handleSignIn={handleSignIn}
          signingIn={signingIn}
          signInMessage={signInMessage}
          signInError={signInError}
        />
      </div>
    );
  }
}