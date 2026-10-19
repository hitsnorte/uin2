import { useTranslations } from "@/app/hooks/useTranslations";

function SignUpModal({
  showSignUpModal,
  setShowSignUpModal,
  email,
  setEmail,
  theme,
  handleSignUp,
  sendingEmail,
  signupMessage,
  signupError,
  acceptedPrivacy,
  setAcceptedPrivacy,
}) {
  const t = useTranslations();

  if (!showSignUpModal) return null;

  const handleClose = () => {
    if (!sendingEmail) {
      setShowSignUpModal(false);
      setEmail("");
      setAcceptedPrivacy(false);
    }
  };

  const canSubmit =
    email.trim() !== "" && acceptedPrivacy && !sendingEmail;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: theme.background,
          color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold mb-2">
          {t.signUp.signUp}
        </h2>

        <p className="text-sm opacity-70 mb-6">
          {t.signUp.description}
        </p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.geral.signValues.email}
          disabled={sendingEmail}
          autoFocus
          className="w-full px-4 py-3 rounded-xl border outline-none mb-4 disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.1)",
            color: theme.text,
            borderColor: `${theme.text}33`,
          }}
        />

        <label className="flex items-start gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
            disabled={sendingEmail}
            className="mt-1 h-4 w-4 cursor-pointer"
          />

          <span className="text-sm leading-5 opacity-80">
            {t.geral.signValues.acceptTerms} {" "}
            <a
              href="https://www.boticashotel.com/en/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
              style={{ color: theme.primary }}
              onClick={(e) => e.stopPropagation()}
            >
              {t.geral.signValues.dataProtectionRegulation}
            </a>
            .
          </span>
        </label>

        {signupError && (
          <p className="text-sm text-red-500 mb-4">
            {signupError}
          </p>
        )}

        {signupMessage && (
          <p className="text-sm text-green-600 mb-4">
            {signupMessage}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={sendingEmail}
            className="px-5 py-3 rounded-xl border transition hover:scale-105 disabled:opacity-50"
            style={{
              borderColor: `${theme.text}33`,
              color: theme.text,
            }}
          >
            {t.geral.buttons.cancel}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!acceptedPrivacy) return;
              handleSignUp();
            }}
            disabled={!canSubmit}
            className="px-5 py-3 rounded-xl font-medium transition hover:scale-105 disabled:opacity-50"
            style={{
              background: theme.primary,
              color: "#fff",
            }}
          >
            {sendingEmail ? t.geral.buttons.sending : t.geral.buttons.send}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignUpModal;