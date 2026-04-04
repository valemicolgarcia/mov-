"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ChevronDown,
  Dumbbell,
  CheckCircle2,
} from "lucide-react";
import type { WorkoutDay, WorkoutLog, SetLog } from "@/lib/workout-data";
import type { useWorkoutStore } from "@/lib/store";

interface WorkoutHistoryProps {
  store: ReturnType<typeof useWorkoutStore>;
  onBack: () => void;
}

export function WorkoutHistory({ store, onBack }: WorkoutHistoryProps) {
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    store.getWorkoutHistory(50).then((data) => {
      setHistory(data as WorkoutLog[]);
      setLoading(false);
    });
  }, [store]);

  const getDayInfo = (dayId: string): WorkoutDay | undefined => {
    return store.routine.find((d) => d.id === dayId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const getExerciseName = (dayId: string, exerciseId: string): string => {
    const day = getDayInfo(dayId);
    if (!day) return exerciseId;
    for (const block of day.blocks) {
      const ex = block.exercises.find((e) => e.id === exerciseId);
      if (ex) return ex.name;
    }
    return exerciseId;
  };

  const countCompletedExercises = (
    exercises: Record<string, SetLog[]>
  ): number => {
    let count = 0;
    for (const sets of Object.values(exercises)) {
      if (sets.some((s) => s?.completed)) count++;
    }
    return count;
  };

  // Group history by date
  const groupedByDate: Record<string, WorkoutLog[]> = {};
  for (const log of history) {
    if (!groupedByDate[log.date]) groupedByDate[log.date] = [];
    groupedByDate[log.date].push(log);
  }

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
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black uppercase tracking-tight text-foreground">
                Historial
              </h1>
              <p className="text-xs text-muted-foreground">
                Entrenamientos completados
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Dumbbell className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Todavía no completaste ningún entrenamiento
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, logs]) => (
              <div key={date}>
                {/* Date header */}
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold capitalize text-foreground">
                    {formatDate(date)}
                  </span>
                </div>

                {/* Sessions for this date */}
                <div className="space-y-2">
                  {logs.map((log) => {
                    const dayInfo = getDayInfo(log.day_id);
                    const isExpanded = expandedId === `${log.day_id}-${log.date}`;

                    return (
                      <div
                        key={`${log.day_id}-${log.date}`}
                        className="overflow-hidden rounded-2xl border border-border bg-card"
                      >
                        <button
                          onClick={() =>
                            setExpandedId(
                              isExpanded ? null : `${log.day_id}-${log.date}`
                            )
                          }
                          className="flex w-full items-center gap-3 p-4 text-left"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl">
                            {dayInfo?.emoji || "🏋️"}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-foreground">
                              {dayInfo?.name || log.day_id}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                              <span>
                                {countCompletedExercises(log.exercises)}{" "}
                                ejercicios
                              </span>
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            className="text-muted-foreground"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border px-4 py-3 space-y-2">
                                {Object.entries(log.exercises).map(
                                  ([exId, sets]) => {
                                    const hasWeights = sets.some(
                                      (s) => s?.weight > 0
                                    );

                                    return (
                                      <div
                                        key={exId}
                                        className="rounded-xl bg-secondary/50 p-3"
                                      >
                                        <h4 className="text-sm font-semibold text-foreground">
                                          {getExerciseName(log.day_id, exId)}
                                        </h4>
                                        {hasWeights ? (
                                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {sets
                                              .filter((s) => s?.completed)
                                              .map((set, i) => (
                                                <span
                                                  key={i}
                                                  className="rounded-md bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                                                >
                                                  {set.weight}kg × {set.reps}
                                                </span>
                                              ))}
                                          </div>
                                        ) : (
                                          <p className="mt-1 text-xs text-primary">
                                            Completado
                                          </p>
                                        )}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-20" />
    </motion.div>
  );
}
