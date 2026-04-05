"use client";

import { motion } from "framer-motion";
import { Dumbbell, Zap, Settings, LogOut, History, Plus, User } from "lucide-react";
import type { WorkoutDay } from "@/lib/workout-data";
import { DayCard } from "./day-card";
import { ThemeToggle } from "@/components/theme-toggle";

interface DaysListProps {
  routine: WorkoutDay[];
  getDayProgress: (dayId: string) => number;
  onSelectDay: (dayId: string) => void;
  onEditRoutine: () => void;
  onViewHistory: () => void;
  onAddExtra: () => void;
  onOpenProfile: () => void;
  onSignOut: () => Promise<void>;
}

export function DaysList({
  routine,
  getDayProgress,
  onSelectDay,
  onEditRoutine,
  onViewHistory,
  onAddExtra,
  onOpenProfile,
  onSignOut,
}: DaysListProps) {
  const currentDate = new Date();
  const weekday = currentDate.toLocaleDateString("es-ES", { weekday: "long" });
  const formattedDate = currentDate.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background"
    >
      {/* Hero section */}
      <div className="relative overflow-hidden border-b border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-lg px-4 pb-8 pt-12">
          {/* Logo/Brand + actions */}
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
                Tu Entrenamiento
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
              onClick={onAddExtra}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              title="Actividad extra"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              onClick={onViewHistory}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              title="Historial"
            >
              <History className="h-5 w-5" />
            </button>
            <button
              onClick={onEditRoutine}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              title="Editar rutina"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={onSignOut}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </motion.div>

          {/* Date and greeting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8"
          >
            <p className="text-sm text-muted-foreground capitalize">
              {weekday}, {formattedDate}
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              ¿Listo para{" "}
              <span className="text-primary">entrenar</span>?
            </h2>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex gap-3"
          >
            <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {routine.length} días
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
              <span className="text-sm text-muted-foreground">
                {routine.reduce((acc, day) => acc + day.blocks.length, 0)}{" "}
                bloques totales
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Days section */}
      <div className="mx-auto max-w-lg px-4 py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-4 flex items-center justify-between"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Tu Rutina
          </h3>
          <span className="text-xs text-muted-foreground">Semana actual</span>
        </motion.div>

        {routine.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border py-12"
          >
            <Dumbbell className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No tenés una rutina configurada
            </p>
            <button
              onClick={onEditRoutine}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground active:scale-95"
            >
              Crear Rutina
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {routine.map((day, index) => (
              <DayCard
                key={day.id}
                day={day}
                index={index}
                progress={getDayProgress(day.id)}
                onClick={() => onSelectDay(day.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="h-20" />
    </motion.div>
  );
}
