"use client";

import { useEffect, useState } from "react";
import { FiMenu } from "react-icons/fi";
import "./loading.css";
import { IoIosLogOut } from "react-icons/io";
import { CiUser } from "react-icons/ci";
// import de sign in/sign up
import SignUpModal from "@/components/sign/signUp";
import SignInModal from "@/components/sign/signIn";
import FrontendHeader from "@/components/layout/frontend/header";

import { useTranslations } from "@/app/hooks/useTranslations";

export default function Homepage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [personalize, setPersonalize] = useState(null);
  const [selectedLang, setSelectedLang] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
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
      setOpenCategory(null);
      window.location.href = "/homepage";

    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
    }
  }
  async function fetchData() {
    setLoading(true);
    const [cats, subs, langs, pers] = await Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/subcategories").then((r) => r.json()),
      fetch("/api/languages").then((r) => r.json()),
      fetch("/api/personalize").then((r) => r.json()),
    ]);

    setCategories(cats.filter((c) => c.visible));
    setSubcategories(subs.filter((s) => s.visible));
    setLanguages(langs.sort((a, b) => a.lang_order - b.lang_order));
    setPersonalize(pers || null);
    setLoading(false);
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

  function getSubs(catId) {
    return subcategories.filter((s) => s.category_id === catId);
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
  console.log(categories);

  if (theme.mode === 2) {
    const data = selectedCategory
      ? subcategories.filter((s) => s.category_id === selectedCategory)
      : categories;

    const rows = chunk(data, [2, 3]);

    return (
      <div
        className="w-full min-h-screen overflow-hidden relative"
        style={{ background: theme.background, color: theme.text }}
      >

        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
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
                    key={i}
                    onClick={() => {
                      if (!selectedCategory) {
                        setSelectedCategory(item.category_id);
                      } else {
                        window.location.href = `/homepage/subcategory/${item.subcategory_id}`;
                      }
                    }}
                    className="w-full min-h-[45vh] sm:min-h-0 sm:aspect-[4/3] rounded-2xl flex items-center justify-center font-semibold cursor-pointer transition hover:scale-[1.02] overflow-hidden"
                    style={{
                      background: getCardColor(rowIndex * 10 + i),
                      backgroundImage: `url("${encodeURI(
                        selectedCategory
                          ? item.subcategory_card_background
                          : item.category_card_background
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
                      {getName(
                        item,
                        selectedCategory ? "subcategory_name" : "category_name"
                      )}
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
          categories={categories}
          subcategories={subcategories}
          personalize={personalize}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          openCategory={openCategory}
          setOpenCategory={setOpenCategory}
          onHomeClick={() => window.location.href = "/homepage"}
          onSubcategoryClick={(subcategoryId) => {
            window.location.href = `/homepage/subcategory/${subcategoryId}`;
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
          {activeSub && (
            <div
              className="max-w-3xl mx-auto p-6 rounded-2xl shadow-xl backdrop-blur-xl border"
              style={{
                background: personalize?.background_color
                  ? `${personalize.background_color}ee`
                  : "rgba(255,255,255,0.9)",
                color: personalize?.foreground_color || "#111",
              }}
            >
              <h1 className="text-xl font-semibold mb-4">
                {getName(activeSub, "subcategory_name")}
              </h1>

              <div className="opacity-80">
                Conteúdo da subcategoria aparecerá aqui...
              </div>
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