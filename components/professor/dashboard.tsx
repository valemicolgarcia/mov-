"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Dumbbell, LogOut, Users, Loader2, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useProfessorStore, type StudentSummary } from "@/lib/professor-store";
import { StudentCard } from "./student-card";

interface ProfessorDashboardProps {
  professorName: string;
  onSelectStudent: (student: StudentSummary) => void;
  onOpenProfile: () => void;
  onSignOut: () => Promise<void>;
}

export function ProfessorDashboard({
  professorName,
  onSelectStudent,
  onOpenProfile,
  onSignOut,
}: ProfessorDashboardProps) {
  const { students, loading, reload } = useProfessorStore();

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reload]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-lg px-4 pb-8 pt-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
              <Dumbbell className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                MOV
              </h1>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Panel Profesor
              </p>
            </div>
            <ThemeToggle />
            <button
              onClick={onOpenProfile}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              title="Mi perfil"
            >
              <User className="h-5 w-5" />
            </button>
            <button
              onClick={onSignOut}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              title="Cerrar sesion"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8"
          >
            <p className="text-sm text-muted-foreground">
              Hola, {professorName}
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              Tus <span className="text-primary">alumnos</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex gap-3"
          >
            <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {students.length} alumno{students.length !== 1 ? "s" : ""}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Student list */}
      <div className="mx-auto max-w-lg px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border py-12"
          >
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Todavia no tenes alumnos vinculados.
              <br />
              Comparti tu usuario y codigo desde Mi perfil para que se conecten.
            </p>
            <button
              type="button"
              onClick={() => reload()}
              className="text-sm font-medium text-primary"
            >
              Actualizar lista
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {students.map((student, index) => (
              <StudentCard
                key={student.id}
                student={student}
                index={index}
                onClick={() => onSelectStudent(student)}
              />
            ))}
          </div>
        )}
      </div>
      <div className="h-20" />
    </motion.div>
  );
}
