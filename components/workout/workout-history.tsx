"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Dumbbell,
  CheckCircle2,
  Pencil,
  Download,
  Activity,
  Clock,
  Footprints,
} from "lucide-react";
import type { WorkoutDay, WorkoutLog, SetLog } from "@/lib/workout-data";
import type { useWorkoutStore } from "@/lib/store";
import { WorkoutReceipt } from "./workout-receipt";

interface WorkoutHistoryProps {
  store: ReturnType<typeof useWorkoutStore>;
  onBack: () => void;
  onEditSession: (dayId: string, date: string) => void;
}

type ExtraSessionRow = {
  id: string;
  date: string;
  activity_type: string;
  duration_minutes: number | null;
  notes: string | null;
  metrics: Record<string, number>;
};

export function WorkoutHistory({ store, onBack, onEditSession }: WorkoutHistoryProps) {
  const { getWorkoutHistory, getExtraSessions } = store;
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [extras, setExtras] = useState<ExtraSessionRow[]>([]);
  const [extrasLoadError, setExtrasLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receiptLog, setReceiptLog] = useState<WorkoutLog | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadHistory = useCallback(() => {
    const fetchExtras =
      typeof getExtraSessions === "function"
        ? getExtraSessions(50)
        : Promise.resolve({ data: [], error: null });

    return Promise.all([getWorkoutHistory(50), fetchExtras]).then(
      ([logs, extrasResult]) => {
        if (!isMounted.current) return;
        setHistory(logs as WorkoutLog[]);
        setExtrasLoadError(null);
        if (
          extrasResult &&
          typeof extrasResult === "object" &&
          "data" in extrasResult
        ) {
          setExtras((extrasResult.data as ExtraSessionRow[]) ?? []);
          setExtrasLoadError(extrasResult.error ?? null);
        } else {
          setExtras((extrasResult as ExtraSessionRow[]) ?? []);
        }
      }
    );
  }, [getWorkoutHistory, getExtraSessions]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadHistory()
      .catch(() => {
        if (!cancelled) {
          setHistory([]);
          setExtras([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      void loadHistory();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadHistory]);

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

  const groupedByDate: Record<string, WorkoutLog[]> = {};
  for (const log of history) {
    if (!groupedByDate[log.date]) groupedByDate[log.date] = [];
    groupedByDate[log.date].push(log);
  }

  const extrasByDate: Record<string, ExtraSessionRow[]> = {};
  for (const ex of extras) {
    if (!extrasByDate[ex.date]) extrasByDate[ex.date] = [];
    extrasByDate[ex.date].push(ex);
  }

  const allDates = Array.from(
    new Set([...Object.keys(groupedByDate), ...Object.keys(extrasByDate)])
  ).sort((a, b) => b.localeCompare(a));

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
                Rutina y actividades extra
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {extrasLoadError && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudieron cargar las actividades extra: {extrasLoadError}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : history.length === 0 && extras.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Dumbbell className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Todavía no completaste ningún entrenamiento ni actividad extra
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {allDates.map((date) => {
              const logs = groupedByDate[date] ?? [];
              const dayExtras = extrasByDate[date] ?? [];
              return (
              <div key={date}>
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold capitalize text-foreground">
                    {formatDate(date)}
                  </span>
                </div>

                <div className="space-y-2">
                  {logs.map((log) => {
                    const dayInfo = getDayInfo(log.day_id);
                    const logKey = `${log.day_id}-${log.date}`;
                    const isExpanded = expandedId === logKey;

                    return (
                      <div
                        key={logKey}
                        className="overflow-hidden rounded-2xl border border-border bg-card"
                      >
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : logKey)
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
                              <div className="border-t border-border px-4 py-3">
                                {/* Action buttons */}
                                <div className="mb-3 flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      onEditSession(log.day_id, log.date)
                                    }
                                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary active:scale-95"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    Editar
                                  </button>
                                  {dayInfo && (
                                    <button
                                      onClick={() => setReceiptLog(log)}
                                      className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground active:scale-95"
                                    >
                                      <Download className="h-3 w-3" />
                                      Comprobante
                                    </button>
                                  )}
                                </div>

                                {/* Exercises summary */}
                                <div className="space-y-2">
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
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {dayExtras.map((ex) => (
                    <div
                      key={`extra-${ex.id}`}
                      className="overflow-hidden rounded-2xl border border-border bg-card"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15">
                          <Activity className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-foreground">
                            {ex.activity_type}
                          </h3>
                          <p className="text-xs text-blue-400/90">
                            Actividad extra
                          </p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {ex.duration_minutes != null && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {ex.duration_minutes} min
                              </span>
                            )}
                            {ex.metrics?.steps != null && (
                              <span className="flex items-center gap-1">
                                <Footprints className="h-3 w-3" />
                                {ex.metrics.steps.toLocaleString()} pasos
                              </span>
                            )}
                            {ex.metrics?.distance_km != null && (
                              <span>{ex.metrics.distance_km} km</span>
                            )}
                          </div>
                          {ex.notes && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {ex.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      <div className="h-20" />

      {/* Receipt modal */}
      <AnimatePresence>
        {receiptLog && getDayInfo(receiptLog.day_id) && (
          <WorkoutReceipt
            day={getDayInfo(receiptLog.day_id)!}
            exercises={receiptLog.exercises}
            date={receiptLog.date}
            onClose={() => setReceiptLog(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
