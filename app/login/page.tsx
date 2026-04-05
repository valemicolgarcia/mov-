"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";

type Mode = "login" | "register";

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Ocurrió un error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Dumbbell className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              MOV
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu Entrenamiento
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-secondary p-1">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              mode === "login"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              mode === "register"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Nombre
              </label>
              <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </motion.div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Email
            </label>
            <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Contraseña
            </label>
            <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"}
                required
                minLength={6}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {mode === "login" ? "Entrar" : "Crear Cuenta"}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
