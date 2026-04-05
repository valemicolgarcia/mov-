"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Download,
  Dumbbell,
  Check,
  Timer,
  CheckSquare,
  Loader2,
} from "lucide-react";
import type { WorkoutDay, SetLog } from "@/lib/workout-data";

interface WorkoutReceiptProps {
  day: WorkoutDay;
  exercises: Record<string, SetLog[]>;
  date: string;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function WorkoutReceipt({
  day,
  exercises,
  date,
  onClose,
}: WorkoutReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `MOV-${day.name.replace(/\s+/g, "-")}-${date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Error generating image:", err);
    } finally {
      setDownloading(false);
    }
  };

  const completedBlocks = day.blocks
    .map((block) => {
      const exercisesWithData = block.exercises
        .map((exercise) => {
          const sets = exercises[exercise.id];
          if (!sets || sets.length === 0) return null;

          const completedSets = sets.filter((s) => s?.completed);
          if (completedSets.length === 0) return null;

          return {
            exercise,
            sets: sets.filter((s) => s?.completed),
          };
        })
        .filter(Boolean);

      if (exercisesWithData.length === 0) return null;
      return { block, exercises: exercisesWithData };
    })
    .filter(Boolean);

  const totalSetsCompleted = Object.values(exercises).reduce(
    (acc, sets) => acc + (sets?.filter((s) => s?.completed).length || 0),
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative mx-4 flex max-h-[90vh] w-full max-w-md flex-col"
      >
        {/* Action buttons */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Generando..." : "Descargar imagen"}
          </button>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-secondary/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable receipt */}
        <div className="overflow-y-auto rounded-2xl">
          {/* ---- RECEIPT CARD (this gets captured) ---- */}
          <div
            ref={receiptRef}
            className="w-full rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-6"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {/* Header */}
            <div className="mb-5 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Dumbbell className="h-5 w-5 text-orange-400" />
                <span className="text-lg font-black tracking-widest text-white">
                  MOV
                </span>
              </div>
              <div className="mx-auto mb-3 h-px w-16 bg-neutral-700" />
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                {day.emoji} {day.name}
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                {formatDate(date)}
              </p>
            </div>

            {/* Stats */}
            <div className="mb-5 flex items-center justify-center gap-6 rounded-xl bg-neutral-900 p-3">
              <div className="text-center">
                <div className="text-2xl font-black text-orange-400">
                  {totalSetsCompleted}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  Series
                </div>
              </div>
              <div className="h-8 w-px bg-neutral-800" />
              <div className="text-center">
                <div className="text-2xl font-black text-orange-400">
                  {completedBlocks.length}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  Bloques
                </div>
              </div>
              <div className="h-8 w-px bg-neutral-800" />
              <div className="text-center">
                <div className="text-2xl font-black text-orange-400">
                  {day.estimatedTime}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  Min
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="mb-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-neutral-800" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                Detalle
              </span>
              <div className="h-px flex-1 bg-neutral-800" />
            </div>

            {/* Blocks */}
            <div className="space-y-4">
              {completedBlocks.map((item) => {
                if (!item) return null;
                const { block, exercises: blockExercises } = item;

                return (
                  <div key={block.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-300">
                        {block.name}
                      </h3>
                    </div>

                    <div className="space-y-1 pl-4">
                      {blockExercises.map((exItem) => {
                        if (!exItem) return null;
                        const { exercise, sets } = exItem;
                        const isWeight =
                          !exercise.isChecklist && !exercise.isTimeBased;

                        return (
                          <div
                            key={exercise.id}
                            className="flex items-start gap-2 py-1"
                          >
                            <div className="mt-0.5">
                              {exercise.isTimeBased ? (
                                <Timer className="h-3 w-3 text-blue-400" />
                              ) : exercise.isChecklist ? (
                                <CheckSquare className="h-3 w-3 text-green-400" />
                              ) : (
                                <Dumbbell className="h-3 w-3 text-orange-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-neutral-200">
                                {exercise.name}
                              </span>
                              {isWeight && (
                                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                  {sets.map((set, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs text-neutral-400"
                                    >
                                      S{idx + 1}:{" "}
                                      <span className="font-semibold text-neutral-200">
                                        {set.weight}kg
                                      </span>{" "}
                                      ×{" "}
                                      <span className="font-semibold text-neutral-200">
                                        {set.reps}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {!isWeight && (
                                <div className="mt-0.5 flex items-center gap-1">
                                  <Check className="h-3 w-3 text-green-400" />
                                  <span className="text-xs text-green-400">
                                    {sets.length}x completado
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 border-t border-neutral-800 pt-4 text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-600">
                Entrenamiento completado
              </p>
              <div className="mt-1 flex items-center justify-center gap-1">
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-sm font-bold text-green-400">
                  Sesión finalizada
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
