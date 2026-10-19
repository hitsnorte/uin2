"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      username,
      password,
    });

    setLoading(false);

    if (res?.error) {
      setError("Credenciais inválidas");
      return;
    }

    window.location.href = "/backend";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-red-500 via-white to-white px-4">

      {/* CARD (GLASS EFFECT) */}
      <div className="w-full max-w-sm bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-6">

        {/* HEADER */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="text-3xl font-extrabold text-gray-900">
            Login
          </div>

          <p className="text-sm text-gray-600 text-center">
            Acede à tua conta
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">

          {/* USERNAME */}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 w-full border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-red-500 bg-white/70"
          />

          {/* PASSWORD */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-red-500 bg-white/70"
          />

          {/* ERROR */}
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition"
          >
            {loading ? "A entrar..." : "Entrar"}
          </button>

        </form>

      </div>
    </div>
  );
}