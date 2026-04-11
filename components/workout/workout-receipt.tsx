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
import {
  buildReceiptLines,
  type WorkoutDay,
  type SetLog,
} from "@/lib/workout-data";

interface WorkoutReceiptProps {
  day: WorkoutDay;
  exercises: Record<string, SetLog[]>;
  /** Orden cronológico de series completadas; si falta, se usa la rutina + datos huérfanos. */
  completion_order?: string[];
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
  completion_order,
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

  const lines = buildReceiptLines(day, exercises, completion_order);

  const distinctBlocks = new Set(lines.map((l) => l.blockName)).size;

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

        <div className="overflow-y-auto rounded-2xl">
          <div
            ref={receiptRef}
            className="w-full rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-6"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
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
                  {distinctBlocks}
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

            <div className="mb-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-neutral-800" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                Detalle (orden de ejecución)
              </span>
              <div className="h-px flex-1 bg-neutral-800" />
            </div>

            <div className="space-y-0">
              {lines.map((item, idx) => {
                const showBlock =
                  idx === 0 || item.blockName !== lines[idx - 1]!.blockName;
                const { exercise, setIndex, set } = item;
                const isWeight =
                  !exercise.isChecklist && !exercise.isTimeBased;
                const roundLabel =
                  exercise.sets > 1 || setIndex > 0
                    ? ` · S${setIndex + 1}`
                    : "";

                return (
                  <div key={`${exercise.id}-${setIndex}-${idx}`}>
                    {showBlock && (
                      <div className="mb-2 mt-4 flex items-center gap-2 first:mt-0">
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-300">
                          {item.blockName}
                        </h3>
                      </div>
                    )}
                    <div className="flex items-start gap-2 border-b border-neutral-900/80 py-2 pl-4">
                      <div className="mt-0.5">
                        {exercise.isTimeBased ? (
                          <Timer className="h-3 w-3 text-blue-400" />
                        ) : exercise.isChecklist ? (
                          <CheckSquare className="h-3 w-3 text-green-400" />
                        ) : (
                          <Dumbbell className="h-3 w-3 text-orange-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-neutral-200">
                          {exercise.name}
                          <span className="text-neutral-500">{roundLabel}</span>
                        </span>
                        {isWeight && (
                          <div className="mt-0.5 text-xs text-neutral-400">
                            <span className="font-semibold text-neutral-200">
                              {set.weight}kg
                            </span>{" "}
                            ×{" "}
                            <span className="font-semibold text-neutral-200">
                              {set.reps}
                            </span>
                          </div>
                        )}
                        {!isWeight && (
                          <div className="mt-0.5 flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-400" />
                            <span className="text-xs text-green-400">
                              Completado
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
