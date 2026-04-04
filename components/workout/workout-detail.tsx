"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Clock, Flame, Check } from "lucide-react";
import type { WorkoutDay } from "@/lib/workout-data";
import type { useWorkoutStore } from "@/lib/store";
import { BlockCard } from "./block-card";

interface WorkoutDetailProps {
  day: WorkoutDay;
  store: ReturnType<typeof useWorkoutStore>;
  onBack: () => void;
}

export function WorkoutDetail({ day, store, onBack }: WorkoutDetailProps) {
  const totalExercises = day.blocks.reduce(
    (acc, block) => acc + block.exercises.length,
    0
  );

  const progress = store.getDayProgress(day.id);
  const dayLog = store.todayLogs[day.id];
  const isCompleted = dayLog?.completed ?? false;

  const handleFinish = async () => {
    await store.finishWorkout(day.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-secondary/80 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-black uppercase tracking-tight text-foreground"
              >
                {day.name}
              </motion.h1>
              <p className="text-xs text-muted-foreground">{day.subtitle}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl">
              {day.emoji}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  {day.estimatedTime} min
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Flame className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  {totalExercises} ejercicios
                </span>
              </div>
            </div>
            {progress > 0 && (
              <span className="text-xs font-bold text-primary">
                {progress}%
              </span>
            )}
          </div>
          {/* Progress bar */}
          {progress > 0 && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Blocks */}
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="space-y-4">
          {day.blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              dayId={day.id}
              store={store}
            />
          ))}
        </div>

        {/* Finish button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={handleFinish}
          disabled={isCompleted}
          className={`mt-8 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-bold transition-transform active:scale-[0.98] ${
            isCompleted
              ? "bg-primary/20 text-primary"
              : "bg-primary text-primary-foreground"
          }`}
        >
          <Check className="h-5 w-5" />
          {isCompleted ? "Entrenamiento Finalizado ✓" : "Finalizar Entrenamiento"}
        </motion.button>
      </div>

      <div className="h-20" />
    </motion.div>
  );
}
