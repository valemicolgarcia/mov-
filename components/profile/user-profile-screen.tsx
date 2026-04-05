"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  GraduationCap,
  KeyRound,
  Loader2,
  Check,
  Copy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { labelForAuthEmail, toAuthEmail } from "@/lib/auth-identity";

interface UserProfileScreenProps {
  onBack: () => void;
}

export function UserProfileScreen({ onBack }: UserProfileScreenProps) {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();

  const [shareCode, setShareCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [codeSaved, setCodeSaved] = useState(false);

  const [profIdentifier, setProfIdentifier] = useState("");
  const [profCode, setProfCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkOk, setLinkOk] = useState(false);

  const [professorName, setProfessorName] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.professor_id || !user) {
      setProfessorName(null);
      return;
    }
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", profile.professor_id)
      .single()
      .then(({ data }) => setProfessorName(data?.display_name ?? null));
  }, [profile?.professor_id, user, supabase]);

  useEffect(() => {
    if (!user || profile?.role !== "professor") return;
    supabase
      .from("profiles")
      .select("share_code")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setShareCode(data.share_code ?? "");
      });
  }, [user, profile?.role, supabase]);

  const email = user?.email ?? "";
  const username = labelForAuthEmail(email);

  const handleSaveShareCode = async () => {
    if (!user || profile?.role !== "professor") return;
    setSavingCode(true);
    setCodeSaved(false);
    const trimmed = shareCode.trim();
    await supabase
      .from("profiles")
      .update({ share_code: trimmed || null })
      .eq("id", user.id);
    await refreshProfile();
    setSavingCode(false);
    setCodeSaved(true);
    setTimeout(() => setCodeSaved(false), 2000);
  };

  const handleLinkProfessor = async () => {
    setLinkError("");
    setLinkOk(false);
    let authEmail: string;
    try {
      authEmail = toAuthEmail(profIdentifier);
    } catch {
      setLinkError("Usuario o email del profesor invalido");
      return;
    }
    if (!profCode.trim()) {
      setLinkError("Ingresa el codigo que te dio tu profesor");
      return;
    }
    setLinking(true);
    const { data, error } = await supabase.rpc("link_student_to_professor", {
      p_professor_email: authEmail,
      p_code: profCode.trim(),
    });
    setLinking(false);
    if (error) {
      setLinkError(error.message);
      return;
    }
    const result = data as { ok?: boolean; error?: string };
    if (!result?.ok) {
      const err = result?.error;
      if (err === "invalid_credentials") {
        setLinkError("Usuario o codigo incorrectos. Pedile a tu profesor el usuario y el codigo desde su perfil.");
      } else if (err === "only_students") {
        setLinkError("Solo los alumnos pueden vincularse a un profesor.");
      } else {
        setLinkError("No se pudo vincular. Intenta de nuevo.");
      }
      return;
    }
    setLinkOk(true);
    await refreshProfile();
    setProfIdentifier("");
    setProfCode("");
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  if (!user || !profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background"
    >
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-4 px-4 py-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-foreground">Mi perfil</h1>
            <p className="text-xs text-muted-foreground">Datos de tu cuenta</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Nombre
              </p>
              <p className="font-semibold text-foreground">
                {profile.display_name || username}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 border-t border-border pt-4">
            <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Email / cuenta</p>
              <p className="break-all text-sm text-foreground">{email}</p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 border-t border-border pt-4">
            <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Usuario</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{username}</p>
                <button
                  type="button"
                  onClick={() => copyText(username)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  title="Copiar usuario"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Rol</p>
              <p className="text-sm font-medium text-foreground">
                {profile.role === "professor" ? "Profesor" : "Alumno"}
              </p>
            </div>
          </div>
        </div>

        {profile.role === "professor" && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Codigo para tus alumnos
              </h2>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Defini un codigo y compartilo junto con tu usuario para que los alumnos se conecten desde su perfil.
            </p>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Codigo de vinculacion
            </label>
            <input
              type="text"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
              placeholder="Ej: MOV2026"
              className="mb-3 w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleSaveShareCode}
              disabled={savingCode}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {savingCode ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : codeSaved ? (
                <>
                  <Check className="h-4 w-4" />
                  Guardado
                </>
              ) : (
                "Guardar codigo"
              )}
            </button>
          </div>
        )}

        {profile.role === "student" && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Profesor
              </h2>
            </div>
            {profile.professor_id ? (
              <p className="text-sm text-foreground">
                Vinculado a:{" "}
                <span className="font-semibold">
                  {professorName ?? "Tu profesor"}
                </span>
              </p>
            ) : (
              <p className="mb-3 text-xs text-muted-foreground">
                Conectate con el usuario de tu profesor y el codigo que te comparte desde su perfil.
              </p>
            )}

            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Usuario o email del profesor
            </label>
            <input
              type="text"
              value={profIdentifier}
              onChange={(e) => setProfIdentifier(e.target.value)}
              placeholder="ej: juan o juan@gmail.com"
              className="mb-3 w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Codigo del profesor
            </label>
            <input
              type="text"
              value={profCode}
              onChange={(e) => setProfCode(e.target.value)}
              placeholder="El que te dio tu profesor"
              className="mb-3 w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {linkError && (
              <p className="mb-2 text-xs text-destructive">{linkError}</p>
            )}
            {linkOk && (
              <p className="mb-2 text-xs text-green-500">
                Listo, ya estas vinculado a tu profesor.
              </p>
            )}
            <button
              type="button"
              onClick={handleLinkProfessor}
              disabled={linking}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {linking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : profile.professor_id ? (
                "Actualizar vinculacion"
              ) : (
                "Conectar con profesor"
              )}
            </button>
          </div>
        )}
      </div>
      <div className="h-16" />
    </motion.div>
  );
}
