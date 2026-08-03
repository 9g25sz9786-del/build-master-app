"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // The recovery link logs the browser in via a token in the URL; once the client
    // has processed it (or finds an existing session), the form below can be used.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo("Password updated. Taking you to your projects…");
      setTimeout(() => {
        router.push("/projects");
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Could not update password. The reset link may have expired — request a new one.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-grid-bg" />
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <Image src="/logo.png" alt="Build Master" width={180} height={180} style={{ borderRadius: 30 }} />
          <span className="auth-brand-name">Build Master</span>
        </div>
        <h1 className="auth-title">Set a new password</h1>
        <p className="auth-sub">
          {ready
            ? "Choose a new password for your account."
            : "Verifying your reset link…"}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-error" style={{ background: "rgba(46,139,111,.12)", color: "#2E8B6F" }}>{info}</div>}

        {ready && (
          <>
            <div className="auth-field">
              <label>New Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="auth-field">
              <label>Confirm New Password</label>
              <input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Updating…" : "Update Password"}
            </button>
          </>
        )}

        {!ready && !error && (
          <p className="note" style={{ textAlign: "center" }}>
            If nothing happens after a few seconds, the link may be invalid or expired — go back to the login page and request a new one.
          </p>
        )}
      </form>
    </div>
  );
}
