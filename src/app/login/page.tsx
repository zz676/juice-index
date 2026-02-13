"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, CheckCircle, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getRedirectBase } from "@/lib/auth/redirect-base";

function LoginForm() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Initialize state from URL params
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    const intentParam = searchParams.get("intent");

    if (modeParam === "password") setMode("password");
    if (modeParam === "magic") setMode("magic");

    if (intentParam === "signup") setIsSignUp(true);
    if (intentParam === "signin") setIsSignUp(false);
  }, [searchParams]);

  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Social Login Handler
  async function handleSocialLogin(provider: "google" | "x") {
    setIsLoading(true);
    setStatus(null);
    try {
      const appUrl = getRedirectBase(window.location.origin);

      // Supabase may register X as "x" or "twitter" depending on config
      type OAuthProvider = "google" | "x" | "twitter";
      const candidates: OAuthProvider[] =
        provider === "x" ? ["x", "twitter"] : ["google"];

      let lastError: Error | null = null;
      for (const candidate of candidates) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: candidate,
          options: { redirectTo: `${appUrl}/auth/callback` },
        });
        if (!error) return;

        const msg = error.message.toLowerCase();
        if (msg.includes("provider is not enabled") || msg.includes("unsupported provider")) {
          lastError = error;
          continue;
        }
        throw error;
      }
      if (lastError) throw lastError;
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Login failed" });
      setIsLoading(false);
    }
  }

  // Email/Password or Magic Link Handler
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setIsLoading(true);
    const appUrl = getRedirectBase(window.location.origin);

    try {
      if (mode === "magic") {
        // Magical Link Flow
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${appUrl}/auth/callback`,
          },
        });
        if (error) throw error;
        setStatus({ type: "success", message: "Check your email for the magic link." });
      } else {
        // Password Flow
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${appUrl}/auth/callback`,
            },
          });
          if (error) throw error;
          setStatus({ type: "success", message: "Account created! Check your email to confirm." });
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          // Successful login redirects automatically or handling session state
          window.location.href = "/dashboard";
        }
      }
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Authentication failed" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-display">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/30">
            J
          </div>
          <span className="font-bold text-2xl text-slate-900 tracking-tight">Juice Index</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Or{" "}
          <Link href="/pricing" className="font-medium text-primary hover:text-primary-dark transition-colors">
            start your 14-day free trial
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => handleSocialLogin("google")}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2.5 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
            <button
              onClick={() => handleSocialLogin("x")}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2.5 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <svg className="h-5 w-5 mr-2 text-slate-900" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X (Twitter)
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-md bg-slate-100 p-1 mb-6">
            <button
              onClick={() => setMode("magic")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-sm transition-all ${mode === "magic" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Magic Link
            </button>
            <button
              onClick={() => setMode("password")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-sm transition-all ${mode === "password" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Password
            </button>
          </div>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {mode === "password" && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2"
                    placeholder="••••••••"
                  />
                </div>
                {!isSignUp && (
                  <div className="flex items-center justify-end mt-1">
                    <Link href="/forgot-password" className="text-xs font-medium text-primary hover:text-primary-dark">
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Status Message */}
            {status && (
              <div
                className={`rounded-md p-4 text-sm flex items-start gap-3 ${status.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                  }`}
              >
                {status.type === "success" ? (
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-slate-900 bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 transition-all"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === "magic" ? (
                <>Send Magic Link <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {mode === "password" && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>

  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
