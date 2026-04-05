"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dumbbell,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  GraduationCap,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { labelForAuthEmail, toAuthEmail } from "@/lib/auth-identity";

type Mode = "login" | "register";
type Role = "student" | "professor";

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [professorEmail, setProfessorEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredHint, setRegisteredHint] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("registered") === "1") {
      setMode("login");
      setRegisteredHint(true);
      router.replace("/login", { scroll: false });
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    let authEmail: string;
    try {
      authEmail = toAuthEmail(identifier);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Usuario o email invalido"
      );
      setLoading(false);
      return;
    }

    try {
      if (mode === "register") {
        let professorResolved: string | undefined;
        if (role === "student" && professorEmail.trim()) {
          try {
            professorResolved = toAuthEmail(professorEmail);
          } catch {
            throw new Error("Usuario o email del profesor invalido");
          }
        }

        const metadata: Record<string, string> = {
          display_name: name || labelForAuthEmail(authEmail),
          role,
        };
        if (professorResolved) {
          metadata.professor_email = professorResolved;
        }

        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: { data: metadata },
        });
        if (error) throw error;
        await supabase.auth.signOut();
        setMode("login");
        setRegisteredHint(true);
        setPassword("");
        router.replace("/login");
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });
        if (error) throw error;
      }
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Ocurrio un error inesperado";
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

        {registeredHint && mode === "login" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
          >
            Cuenta creada. Inicia sesion con tu usuario y contrasena.
          </motion.div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-secondary p-1">
          <button
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              mode === "login"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            Iniciar Sesion
          </button>
          <button
            onClick={() => {
              setMode("register");
              setError("");
            }}
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
              className="space-y-4"
            >
              {/* Name */}
              <div>
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
              </div>

              {/* Role selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Soy...
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                      role === "student"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    Alumno
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("professor")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                      role === "professor"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    Profesor
                  </button>
                </div>
              </div>

              {/* Professor email (only for students) */}
              {role === "student" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Usuario o email del profesor (opcional)
                  </label>
                  <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      autoComplete="off"
                      value={professorEmail}
                      onChange={(e) => setProfessorEmail(e.target.value)}
                      placeholder="mismo formato que usa tu profesor"
                      className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Para que tu profesor vea tu progreso
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Usuario o email
            </label>
            <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                inputMode="email"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ej: maria o maria@gmail.com"
                required
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sin correo: elegi un usuario unico (se guarda como maria@mov.internal)
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Contrasena
            </label>
            <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "register" ? "Minimo 6 caracteres" : "Tu contrasena"
                }
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
