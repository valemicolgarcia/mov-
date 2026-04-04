"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, TrendingUp, Calendar } from "lucide-react";
import type { SetLog } from "@/lib/workout-data";

interface ExerciseHistoryProps {
  exerciseName: string;
  getHistory: () => Promise<{ date: string; sets: SetLog[] }[]>;
  onClose: () => void;
}

export function ExerciseHistory({
  exerciseName,
  getHistory,
  onClose,
}: ExerciseHistoryProps) {
  const [history, setHistory] = useState<{ date: string; sets: SetLog[] }[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then((data) => {
      setHistory(data);
      setLoading(false);
    });
  }, [getHistory]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card"
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {exerciseName}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Historial de sesiones
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-5 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay historial todavía. Completá tu primer entrenamiento.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry, i) => (
                <div
                  key={entry.date}
                  className="rounded-xl bg-secondary/50 p-4"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(entry.date)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.sets
                      .filter((s) => s?.completed)
                      .map((set, j) => (
                        <div
                          key={j}
                          className="rounded-lg bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                        >
                          {set.weight > 0
                            ? `${set.weight}kg × ${set.reps}`
                            : "Completado"}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
