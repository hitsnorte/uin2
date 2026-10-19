import { useTranslations } from "@/app/hooks/useTranslations";

function SignInModal({
  showSignInModal,
  setShowSignInModal,
  theme,
  signInStep,
  setSignInStep,
  accessCode,
  setAccessCode,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  handleSignIn,
  signingIn,
  signInMessage,
  signInError,
}) {
  const t = useTranslations();

  if (!showSignInModal) return null;

  function closeModal() {
    if (signingIn) return;

    setShowSignInModal(false);
    setSignInStep("method");

    setAccessCode("");
    setPassword("");
    setConfirmPassword("");

    setLoginEmail("");
    setLoginPassword("");
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: theme.background,
          color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ESCOLHER MÉTODO */}
        {signInStep === "method" && (
          <>
            <h2 className="text-2xl font-semibold mb-2">
              {t.signIn.signIn}
            </h2>

            <p className="text-sm opacity-70 mb-6">
              {t.signIn.description}
            </p>

            <button
              type="button"
              onClick={() => setSignInStep("login")}
              className="w-full px-5 py-4 rounded-xl font-medium transition hover:scale-[1.02]"
              style={{
                background: theme.primary,
                color: "#fff",
              }}
            >
              {t.signIn.signInInfo}
            </button>

            <button
              type="button"
              onClick={() => setSignInStep("code")}
              className="w-full mt-3 px-5 py-4 rounded-xl font-medium transition hover:scale-[1.02] border"
              style={{
                borderColor: `${theme.text}33`,
                color: theme.text,
              }}
            >
              {t.signIn.signInCode}
            </button>

            <button
              type="button"
              onClick={closeModal}
              className="w-full mt-3 px-5 py-3 rounded-xl border"
              style={{
                borderColor: `${theme.text}33`,
                color: theme.text,
              }}
            >
              {t.geral.buttons.cancel}
            </button>
          </>
        )}

        {/* LOGIN COM EMAIL + PASSWORD */}
        {signInStep === "login" && (
          <>
            <h2 className="text-2xl font-semibold mb-2">
              {t.signIn.signIn}
            </h2>

            <p className="text-sm opacity-70 mb-6">
              {t.signIn.signInPathInfo}
            </p>

            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder={t.geral.signValues.email}
              disabled={signingIn}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border outline-none mb-3 disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: theme.text,
                borderColor: `${theme.text}33`,
              }}
            />

            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder={t.geral.signValues.password}
              disabled={signingIn}
              className="w-full px-4 py-3 rounded-xl border outline-none mb-4 disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: theme.text,
                borderColor: `${theme.text}33`,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !signingIn) {
                  handleSignIn();
                }
              }}
            />

            {signInError && (
              <p className="text-sm text-red-500 mb-4">
                {signInError}
              </p>
            )}

            {signInMessage && (
              <p className="text-sm text-green-600 mb-4">
                {signInMessage}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSignInStep("method");
                  setLoginEmail("");
                  setLoginPassword("");
                }}
                disabled={signingIn}
                className="px-5 py-3 rounded-xl border"
                style={{
                  borderColor: `${theme.text}33`,
                  color: theme.text,
                }}
              >
                {t.geral.buttons.back}
              </button>

              <button
                type="button"
                onClick={handleSignIn}
                disabled={
                  signingIn ||
                  !loginEmail.trim() ||
                  !loginPassword
                }
                className="px-5 py-3 rounded-xl font-medium disabled:opacity-50"
                style={{
                  background: theme.primary,
                  color: "#fff",
                }}
              >
                {signingIn ? "A entrar..." : "Entrar"}
              </button>
            </div>
          </>
        )}

        {/* INTRODUZIR CÓDIGO */}
        {signInStep === "code" && (
          <>
            <h2 className="text-2xl font-semibold mb-2">
              {t.signIn.accessCode}
            </h2>

            <p className="text-sm opacity-70 mb-6">
              {t.signIn.accessCodeInfo}
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={accessCode}
              onChange={(e) =>
                setAccessCode(
                  e.target.value.replace(/\D/g, "")
                )
              }
              placeholder="------"
              disabled={signingIn}
              autoFocus
              className="w-full px-4 py-4 rounded-xl border outline-none mb-4 text-center text-2xl tracking-[0.5em]"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: theme.text,
                borderColor: `${theme.text}33`,
              }}
            />

            {signInError && (
              <p className="text-sm text-red-500 mb-4">
                {signInError}
              </p>
            )}

            {signInMessage && (
              <p className="text-sm text-green-600 mb-4">
                {signInMessage}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSignInStep("method")}
                disabled={signingIn}
                className="px-5 py-3 rounded-xl border"
                style={{
                  borderColor: `${theme.text}33`,
                  color: theme.text,
                }}
              >
                {t.geral.buttons.back}
              </button>

              <button
                type="button"
                onClick={handleSignIn}
                disabled={signingIn || accessCode.length !== 6}
                className="px-5 py-3 rounded-xl font-medium disabled:opacity-50"
                style={{
                  background: theme.primary,
                  color: "#fff",
                }}
              >
                {signingIn ? t.geral.buttons.checking : t.geral.buttons.continue}
              </button>
            </div>
          </>
        )}

        {/* DEFINIR EMAIL + PASSWORD */}
        {signInStep === "account_setup" && (
          <>
            <h2 className="text-2xl font-semibold mb-2">
              {t.signIn.setPassword}
            </h2>

            <p className="text-sm opacity-70 mb-6">
              Este código está incompleto. Introduza o email e defina a password para continuar.
            </p>

            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder={t.geral.signValues.email}
              disabled={signingIn}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border outline-none mb-3 disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: theme.text,
                borderColor: `${theme.text}33`,
              }}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.geral.signValues.password}
              disabled={signingIn}
              className="w-full px-4 py-3 rounded-xl border outline-none mb-3"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: theme.text,
                borderColor: `${theme.text}33`,
              }}
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.geral.signValues.confirmPassword}
              disabled={signingIn}
              className="w-full px-4 py-3 rounded-xl border outline-none mb-4"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: theme.text,
                borderColor: `${theme.text}33`,
              }}
            />

            {signInError && (
              <p className="text-sm text-red-500 mb-4">
                {signInError}
              </p>
            )}

            {signInMessage && (
              <p className="text-sm text-green-600 mb-4">
                {signInMessage}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSignInStep("method")}
                disabled={signingIn}
                className="px-5 py-3 rounded-xl border"
                style={{
                  borderColor: `${theme.text}33`,
                  color: theme.text,
                }}
              >
                {t.geral.buttons.back}
              </button>

              <button
                type="button"
                onClick={handleSignIn}
                disabled={signingIn}
                className="px-5 py-3 rounded-xl font-medium disabled:opacity-50"
                style={{
                  background: theme.primary,
                  color: "#fff",
                }}
              >
                {signingIn ? t.geral.buttons.saving : t.signIn.setPassword}
              </button>
            </div>
          </>
        )}

        {/* DEFINIR PASSWORD */}
        {signInStep === "password" && (
          <>
            <h2 className="text-2xl font-semibold mb-2">
              {t.signIn.setPassword}
            </h2>

            <p className="text-sm opacity-70 mb-6">
              {t.signIn.setPasswordInfo}
            </p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.geral.signValues.password}
              disabled={signingIn}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border outline-none mb-3"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: theme.text,
                borderColor: `${theme.text}33`,
              }}
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.geral.signValues.confirmPassword}
              disabled={signingIn}
              className="w-full px-4 py-3 rounded-xl border outline-none mb-4"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: theme.text,
                borderColor: `${theme.text}33`,
              }}
            />

            {signInError && (
              <p className="text-sm text-red-500 mb-4">
                {signInError}
              </p>
            )}

            {signInMessage && (
              <p className="text-sm text-green-600 mb-4">
                {signInMessage}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSignInStep("code")}
                disabled={signingIn}
                className="px-5 py-3 rounded-xl border"
                style={{
                  borderColor: `${theme.text}33`,
                  color: theme.text,
                }}
              >
                {t.geral.buttons.back}
              </button>

              <button
                type="button"
                onClick={handleSignIn}
                disabled={signingIn}
                className="px-5 py-3 rounded-xl font-medium disabled:opacity-50"
                style={{
                  background: theme.primary,
                  color: "#fff",
                }}
              >
                {signingIn ? t.geral.buttons.saving : t.signIn.setPassword}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SignInModal;