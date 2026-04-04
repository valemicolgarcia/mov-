"use client";

import { motion } from "framer-motion";
import { Clock, ChevronRight, Flame } from "lucide-react";
import type { WorkoutDay } from "@/lib/workout-data";

interface DayCardProps {
  day: WorkoutDay;
  index: number;
  progress: number;
  onClick: () => void;
}

export function DayCard({ day, index, progress, onClick }: DayCardProps) {
  const totalExercises = day.blocks.reduce(
    (acc, block) => acc + block.exercises.length,
    0
  );

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl bg-card border border-border p-6 text-left transition-all duration-300 hover:border-primary/50 hover:bg-card/80 active:scale-[0.98]"
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${day.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">
              {day.emoji}
            </div>
            <div>
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Día {index + 1}
              </span>
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                {day.name}
              </h3>
            </div>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            progress === 100
              ? "bg-primary text-primary-foreground"
              : "bg-secondary group-hover:bg-primary group-hover:text-primary-foreground"
          }`}>
            {progress === 100 ? (
              <span className="text-sm font-bold">✓</span>
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Subtitle */}
        <p className="mt-3 text-sm text-muted-foreground">{day.subtitle}</p>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{day.estimatedTime} min</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5" />
            <span>{totalExercises} ejercicios</span>
          </div>
          <div className="ml-auto">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {day.blocks.length} bloques
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-full bg-primary"
          />
        </div>
        {progress > 0 && (
          <p className="mt-1.5 text-right text-xs font-medium text-primary">
            {progress}% completado
          </p>
        )}
      </div>
    </motion.button>
  );
}
