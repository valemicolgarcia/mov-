"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  Clock,
  Timer,
  ListChecks,
  Youtube,
} from "lucide-react";
import type { WorkoutDay, Block, Exercise } from "@/lib/workout-data";

interface DayEditorProps {
  day: WorkoutDay;
  onSave: (day: WorkoutDay) => void;
  onBack: () => void;
}

const EMOJIS = ["🦵", "💪", "🔥", "🏋️", "⚡", "🎯", "💥", "🚀", "🏃", "🤸"];

export function DayEditor({ day, onSave, onBack }: DayEditorProps) {
  const [editedDay, setEditedDay] = useState<WorkoutDay>({ ...day });
  const [expandedBlock, setExpandedBlock] = useState<string | null>(
    day.blocks[0]?.id || null
  );

  const updateDay = (updates: Partial<WorkoutDay>) => {
    setEditedDay((prev) => ({ ...prev, ...updates }));
  };

  // Block operations
  const addBlock = () => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      name: `BLOQUE ${editedDay.blocks.length + 1}`,
      rounds: 3,
      notes: "",
      exercises: [],
    };
    updateDay({ blocks: [...editedDay.blocks, newBlock] });
    setExpandedBlock(newBlock.id);
  };

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    updateDay({
      blocks: editedDay.blocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } : b
      ),
    });
  };

  const deleteBlock = (blockId: string) => {
    updateDay({ blocks: editedDay.blocks.filter((b) => b.id !== blockId) });
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newBlocks = [...editedDay.blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[targetIndex]] = [
      newBlocks[targetIndex],
      newBlocks[index],
    ];
    updateDay({ blocks: newBlocks });
  };

  // Exercise operations
  const addExercise = (blockId: string) => {
    const block = editedDay.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const newExercise: Exercise = {
      id: `ex-${Date.now()}`,
      name: "",
      sets: 3,
      targetReps: "10-12",
    };
    updateBlock(blockId, { exercises: [...block.exercises, newExercise] });
  };

  const updateExercise = (
    blockId: string,
    exerciseId: string,
    updates: Partial<Exercise>
  ) => {
    const block = editedDay.blocks.find((b) => b.id === blockId);
    if (!block) return;
    updateBlock(blockId, {
      exercises: block.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      ),
    });
  };

  const deleteExercise = (blockId: string, exerciseId: string) => {
    const block = editedDay.blocks.find((b) => b.id === blockId);
    if (!block) return;
    updateBlock(blockId, {
      exercises: block.exercises.filter((ex) => ex.id !== exerciseId),
    });
  };

  const moveExercise = (
    blockId: string,
    index: number,
    direction: "up" | "down"
  ) => {
    const block = editedDay.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const newExercises = [...block.exercises];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newExercises.length) return;
    [newExercises[index], newExercises[targetIndex]] = [
      newExercises[targetIndex],
      newExercises[index],
    ];
    updateBlock(blockId, { exercises: newExercises });
  };

  const cycleExerciseType = (blockId: string, exercise: Exercise) => {
    if (!exercise.isTimeBased && !exercise.isChecklist) {
      updateExercise(blockId, exercise.id, {
        isTimeBased: true,
        isChecklist: false,
        targetTime: 30,
        targetReps: undefined,
        sets: 1,
      });
    } else if (exercise.isTimeBased) {
      updateExercise(blockId, exercise.id, {
        isTimeBased: false,
        isChecklist: true,
        targetTime: undefined,
        targetReps: "15",
        sets: 1,
      });
    } else {
      updateExercise(blockId, exercise.id, {
        isTimeBased: false,
        isChecklist: false,
        targetTime: undefined,
        targetReps: "10-12",
        sets: 3,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
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
                Editar Día
              </h1>
            </div>
            <button
              onClick={() => onSave(editedDay)}
              className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground active:scale-95"
            >
              <Check className="h-4 w-4" />
              Listo
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Day info */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Nombre del día
            </label>
            <input
              type="text"
              value={editedDay.name}
              onChange={(e) => updateDay({ name: e.target.value.toUpperCase() })}
              className="w-full rounded-xl bg-secondary px-4 py-3 text-base font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: PIERNAS Y GLÚTEOS"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Subtítulo
            </label>
            <input
              type="text"
              value={editedDay.subtitle}
              onChange={(e) => updateDay({ subtitle: e.target.value })}
              className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Fuerza & Hipertrofia"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Emoji
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => updateDay({ emoji })}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all ${
                      editedDay.emoji === emoji
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-secondary"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Tiempo estimado (min)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={editedDay.estimatedTime}
              onChange={(e) =>
                updateDay({ estimatedTime: parseInt(e.target.value) || 0 })
              }
              className="w-24 rounded-xl bg-secondary px-4 py-3 text-center text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Blocks */}
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Bloques
          </h2>

          <div className="space-y-3">
            {editedDay.blocks.map((block, blockIdx) => (
              <div
                key={block.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                {/* Block header */}
                <div className="flex items-center gap-2 p-4">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveBlock(blockIdx, "up")}
                      disabled={blockIdx === 0}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground disabled:opacity-20"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveBlock(blockIdx, "down")}
                      disabled={blockIdx === editedDay.blocks.length - 1}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground disabled:opacity-20"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      setExpandedBlock(
                        expandedBlock === block.id ? null : block.id
                      )
                    }
                    className="flex-1 text-left"
                  >
                    <h3 className="text-sm font-bold uppercase text-foreground">
                      {block.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {block.rounds} vueltas · {block.exercises.length}{" "}
                      ejercicios
                    </p>
                  </button>

                  <button
                    onClick={() => deleteBlock(block.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Block expanded content */}
                <AnimatePresence>
                  {expandedBlock === block.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 border-t border-border px-4 py-4">
                        {/* Block fields */}
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">
                              Nombre
                            </label>
                            <input
                              type="text"
                              value={block.name}
                              onChange={(e) =>
                                updateBlock(block.id, {
                                  name: e.target.value.toUpperCase(),
                                })
                              }
                              className="w-full rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="w-20">
                            <label className="mb-1 block text-xs text-muted-foreground">
                              Vueltas
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={block.rounds}
                              onChange={(e) =>
                                updateBlock(block.id, {
                                  rounds: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full rounded-lg bg-secondary px-3 py-2 text-center text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Notas del bloque
                          </label>
                          <input
                            type="text"
                            value={block.notes || ""}
                            onChange={(e) =>
                              updateBlock(block.id, { notes: e.target.value })
                            }
                            placeholder="Ej: Descanso 90 seg entre series"
                            className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        {/* Exercises */}
                        <div className="space-y-2">
                          {block.exercises.map((exercise, exIdx) => (
                            <div
                              key={exercise.id}
                              className="rounded-xl bg-secondary/50 p-3"
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex flex-col gap-0.5 pt-1">
                                  <button
                                    onClick={() =>
                                      moveExercise(block.id, exIdx, "up")
                                    }
                                    disabled={exIdx === 0}
                                    className="flex h-4 w-4 items-center justify-center text-muted-foreground disabled:opacity-20"
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      moveExercise(block.id, exIdx, "down")
                                    }
                                    disabled={
                                      exIdx === block.exercises.length - 1
                                    }
                                    className="flex h-4 w-4 items-center justify-center text-muted-foreground disabled:opacity-20"
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                </div>

                                <div className="flex-1 space-y-2">
                                  <input
                                    type="text"
                                    value={exercise.name}
                                    onChange={(e) =>
                                      updateExercise(
                                        block.id,
                                        exercise.id,
                                        { name: e.target.value }
                                      )
                                    }
                                    placeholder="Nombre del ejercicio"
                                    className="w-full rounded-lg bg-background px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                  />

                                  <div>
                                    <label className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Youtube className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                      Video (YouTube)
                                    </label>
                                    <input
                                      type="url"
                                      inputMode="url"
                                      value={exercise.videoUrl || ""}
                                      onChange={(e) => {
                                        const v = e.target.value.trim();
                                        updateExercise(
                                          block.id,
                                          exercise.id,
                                          {
                                            videoUrl: v || undefined,
                                          }
                                        );
                                      }}
                                      placeholder="https://www.youtube.com/watch?v=… o Shorts"
                                      className="w-full rounded-lg bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Type toggle */}
                                    <button
                                      onClick={() =>
                                        cycleExerciseType(block.id, exercise)
                                      }
                                      className="flex h-8 items-center gap-1 rounded-lg bg-background px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                                      title="Cambiar tipo"
                                    >
                                      {exercise.isTimeBased ? (
                                        <>
                                          <Timer className="h-3 w-3" />
                                          Timer
                                        </>
                                      ) : exercise.isChecklist ? (
                                        <>
                                          <ListChecks className="h-3 w-3" />
                                          Check
                                        </>
                                      ) : (
                                        <>
                                          <Clock className="h-3 w-3" />
                                          Peso/Reps
                                        </>
                                      )}
                                    </button>

                                    {!exercise.isTimeBased && (
                                      <>
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          value={exercise.sets}
                                          onChange={(e) =>
                                            updateExercise(
                                              block.id,
                                              exercise.id,
                                              {
                                                sets:
                                                  parseInt(e.target.value) || 1,
                                              }
                                            )
                                          }
                                          className="w-14 rounded-lg bg-background px-2 py-1.5 text-center text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          series
                                        </span>
                                        <input
                                          type="text"
                                          value={exercise.targetReps || ""}
                                          onChange={(e) =>
                                            updateExercise(
                                              block.id,
                                              exercise.id,
                                              { targetReps: e.target.value }
                                            )
                                          }
                                          placeholder="8-12"
                                          className="w-16 rounded-lg bg-background px-2 py-1.5 text-center text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          reps
                                        </span>
                                      </>
                                    )}

                                    {exercise.isTimeBased && (
                                      <>
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          value={exercise.targetTime || 30}
                                          onChange={(e) =>
                                            updateExercise(
                                              block.id,
                                              exercise.id,
                                              {
                                                targetTime:
                                                  parseInt(e.target.value) || 0,
                                              }
                                            )
                                          }
                                          className="w-16 rounded-lg bg-background px-2 py-1.5 text-center text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          seg
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  <input
                                    type="text"
                                    value={exercise.notes || ""}
                                    onChange={(e) =>
                                      updateExercise(
                                        block.id,
                                        exercise.id,
                                        { notes: e.target.value }
                                      )
                                    }
                                    placeholder="Notas (opcional)"
                                    className="w-full rounded-lg bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>

                                <button
                                  onClick={() =>
                                    deleteExercise(block.id, exercise.id)
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive active:scale-95"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            onClick={() => addExercise(block.id)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            <Plus className="h-4 w-4" />
                            Agregar Ejercicio
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            <button
              onClick={addBlock}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-5 w-5" />
              Agregar Bloque
            </button>
          </div>
        </div>
      </div>

      <div className="h-20" />
    </motion.div>
  );
}
