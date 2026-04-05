"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Dumbbell,
  CheckCircle2,
  Pencil,
  Check,
  X,
  Minus,
  Plus,
  Download,
} from "lucide-react";
import type { WorkoutDay, WorkoutLog, SetLog } from "@/lib/workout-data";
import type { useWorkoutStore } from "@/lib/store";
import { WorkoutReceipt } from "./workout-receipt";

interface WorkoutHistoryProps {
  store: ReturnType<typeof useWorkoutStore>;
  onBack: () => void;
}

interface EditingSet {
  exerciseId: string;
  setIndex: number;
  weight: string;
  reps: string;
}

export function WorkoutHistory({ store, onBack }: WorkoutHistoryProps) {
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<string | null>(null);
  const [editingSet, setEditingSet] = useState<EditingSet | null>(null);
  const [saving, setSaving] = useState(false);
  const [receiptLog, setReceiptLog] = useState<WorkoutLog | null>(null);

  useEffect(() => {
    store.getWorkoutHistory(50).then((data) => {
      setHistory(data as WorkoutLog[]);
      setLoading(false);
    });
  }, [store]);

  const reloadHistory = useCallback(() => {
    store.getWorkoutHistory(50).then((data) => {
      setHistory(data as WorkoutLog[]);
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

  const getExerciseInfo = (dayId: string, exerciseId: string) => {
    const day = getDayInfo(dayId);
    if (!day) return null;
    for (const block of day.blocks) {
      const ex = block.exercises.find((e) => e.id === exerciseId);
      if (ex) return ex;
    }
    return null;
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

  const handleStartEdit = (logKey: string) => {
    setEditingLog(logKey);
    setEditingSet(null);
  };

  const handleCancelEdit = () => {
    setEditingLog(null);
    setEditingSet(null);
  };

  const handleEditSet = (
    exerciseId: string,
    setIndex: number,
    set: SetLog
  ) => {
    setEditingSet({
      exerciseId,
      setIndex,
      weight: set.weight.toString(),
      reps: set.reps.toString(),
    });
  };

  const handleSaveSet = async (dayId: string, date: string) => {
    if (!editingSet) return;
    setSaving(true);

    const weight = parseFloat(editingSet.weight) || 0;
    const reps = parseInt(editingSet.reps) || 0;

    await store.updateHistoryLog(
      dayId,
      date,
      editingSet.exerciseId,
      editingSet.setIndex,
      weight,
      reps
    );

    setHistory((prev) =>
      prev.map((log) => {
        if (log.day_id === dayId && log.date === date) {
          const exercises = { ...log.exercises };
          if (!exercises[editingSet.exerciseId])
            exercises[editingSet.exerciseId] = [];
          const sets = [...exercises[editingSet.exerciseId]];
          sets[editingSet.setIndex] = { weight, reps, completed: true };
          exercises[editingSet.exerciseId] = sets;
          return { ...log, exercises };
        }
        return log;
      })
    );

    setEditingSet(null);
    setSaving(false);
  };

  const adjustEditValue = (
    field: "weight" | "reps",
    delta: number
  ) => {
    if (!editingSet) return;
    const current = parseFloat(editingSet[field]) || 0;
    const newVal = Math.max(0, current + delta);
    setEditingSet({ ...editingSet, [field]: newVal.toString() });
  };

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
                    const isEditing = editingLog === logKey;

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
                                {/* Edit/Receipt buttons */}
                                <div className="mb-3 flex items-center gap-2">
                                  {isEditing ? (
                                    <button
                                      onClick={handleCancelEdit}
                                      className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground active:scale-95"
                                    >
                                      <X className="h-3 w-3" />
                                      Cancelar edición
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleStartEdit(logKey)}
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
                                    </>
                                  )}
                                </div>

                                {/* Exercises */}
                                <div className="space-y-2">
                                  {Object.entries(log.exercises).map(
                                    ([exId, sets]) => {
                                      const exInfo = getExerciseInfo(
                                        log.day_id,
                                        exId
                                      );
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
                                                .map((set, i) => ({
                                                  set,
                                                  originalIndex: i,
                                                }))
                                                .filter(
                                                  ({ set }) => set?.completed
                                                )
                                                .map(
                                                  ({ set, originalIndex }) => {
                                                    const isEditingThis =
                                                      isEditing &&
                                                      editingSet?.exerciseId ===
                                                        exId &&
                                                      editingSet?.setIndex ===
                                                        originalIndex;

                                                    if (isEditingThis) {
                                                      return (
                                                        <div
                                                          key={originalIndex}
                                                          className="flex items-center gap-1 rounded-lg border border-primary bg-background p-1.5"
                                                        >
                                                          {/* Weight */}
                                                          <button
                                                            onClick={() =>
                                                              adjustEditValue(
                                                                "weight",
                                                                -2.5
                                                              )
                                                            }
                                                            className="flex h-7 w-7 items-center justify-center rounded bg-secondary text-muted-foreground active:scale-95"
                                                          >
                                                            <Minus className="h-3 w-3" />
                                                          </button>
                                                          <input
                                                            type="number"
                                                            inputMode="decimal"
                                                            value={
                                                              editingSet!.weight
                                                            }
                                                            onChange={(e) =>
                                                              setEditingSet({
                                                                ...editingSet!,
                                                                weight:
                                                                  e.target
                                                                    .value,
                                                              })
                                                            }
                                                            className="h-7 w-12 rounded bg-secondary px-1 text-center text-xs font-bold tabular-nums text-foreground focus:outline-none"
                                                          />
                                                          <button
                                                            onClick={() =>
                                                              adjustEditValue(
                                                                "weight",
                                                                2.5
                                                              )
                                                            }
                                                            className="flex h-7 w-7 items-center justify-center rounded bg-secondary text-muted-foreground active:scale-95"
                                                          >
                                                            <Plus className="h-3 w-3" />
                                                          </button>

                                                          <span className="text-xs text-muted-foreground">
                                                            ×
                                                          </span>

                                                          {/* Reps */}
                                                          <button
                                                            onClick={() =>
                                                              adjustEditValue(
                                                                "reps",
                                                                -1
                                                              )
                                                            }
                                                            className="flex h-7 w-7 items-center justify-center rounded bg-secondary text-muted-foreground active:scale-95"
                                                          >
                                                            <Minus className="h-3 w-3" />
                                                          </button>
                                                          <input
                                                            type="number"
                                                            inputMode="numeric"
                                                            value={
                                                              editingSet!.reps
                                                            }
                                                            onChange={(e) =>
                                                              setEditingSet({
                                                                ...editingSet!,
                                                                reps: e.target
                                                                  .value,
                                                              })
                                                            }
                                                            className="h-7 w-10 rounded bg-secondary px-1 text-center text-xs font-bold tabular-nums text-foreground focus:outline-none"
                                                          />
                                                          <button
                                                            onClick={() =>
                                                              adjustEditValue(
                                                                "reps",
                                                                1
                                                              )
                                                            }
                                                            className="flex h-7 w-7 items-center justify-center rounded bg-secondary text-muted-foreground active:scale-95"
                                                          >
                                                            <Plus className="h-3 w-3" />
                                                          </button>

                                                          {/* Save */}
                                                          <button
                                                            onClick={() =>
                                                              handleSaveSet(
                                                                log.day_id,
                                                                log.date
                                                              )
                                                            }
                                                            disabled={saving}
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground active:scale-95 disabled:opacity-50"
                                                          >
                                                            <Check className="h-3.5 w-3.5" />
                                                          </button>
                                                        </div>
                                                      );
                                                    }

                                                    return (
                                                      <button
                                                        key={originalIndex}
                                                        onClick={() =>
                                                          isEditing &&
                                                          handleEditSet(
                                                            exId,
                                                            originalIndex,
                                                            set
                                                          )
                                                        }
                                                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                                          isEditing
                                                            ? "bg-primary/10 text-primary border border-primary/30 active:scale-95 cursor-pointer"
                                                            : "bg-background text-foreground cursor-default"
                                                        }`}
                                                      >
                                                        {set.weight}kg ×{" "}
                                                        {set.reps}
                                                        {isEditing && (
                                                          <Pencil className="ml-1 inline h-2.5 w-2.5" />
                                                        )}
                                                      </button>
                                                    );
                                                  }
                                                )}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-20" />

      {/* Receipt modal from history */}
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
