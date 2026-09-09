"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await signIn("credentials-internal", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Credenciales inválidas");
    } else {
      window.location.href = "/";
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: "4rem auto" }}>
      <h1>Login de prueba</h1>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 8 }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 8 }}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit">Entrar</button>
    </form>
  );
}