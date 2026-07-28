"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/projects");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setInfo("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-grid-bg" />
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <Image src="/logo.png" alt="Build Master" width={72} height={72} style={{ borderRadius: 16 }} />
          <span className="auth-brand-name">Build Master</span>
        </div>
        <h1 className="auth-title">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
        <p className="auth-sub">Build Master Project Feasibility App — commercial investment intelligence.</p>

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-error" style={{ background: "rgba(46,139,111,.12)", color: "#2E8B6F" }}>{info}</div>}

        {mode === "signup" && (
          <div className="auth-field">
            <label>Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div className="auth-field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div className="auth-field">
          <label>Password</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <div className="auth-toggle">
          {mode === "signin" ? (
            <>No account yet? <button type="button" onClick={() => { setMode("signup"); setError(null); }}>Create one</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => { setMode("signin"); setError(null); }}>Sign in</button></>
          )}
        </div>
      </form>
    </div>
  );
}
