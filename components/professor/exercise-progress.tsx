"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WorkoutDay, SetLog } from "@/lib/workout-data";

interface ExerciseProgressProps {
  routine: WorkoutDay[];
  studentId: string;
  getExerciseProgressData: (
    studentId: string,
    exerciseId: string
  ) => Promise<{ date: string; sets: SetLog[] }[]>;
  onBack: () => void;
}

interface ProgressEntry {
  date: string;
  dateLabel: string;
  maxWeight: number;
  totalReps: number;
}

export function ExerciseProgress({
  routine,
  studentId,
  getExerciseProgressData,
  onBack,
}: ExerciseProgressProps) {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );
  const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const selectedDay = routine.find((d) => d.id === selectedDayId);

  const weightExercises =
    selectedDay?.blocks.flatMap((b) =>
      b.exercises.filter((e) => !e.isChecklist && !e.isTimeBased)
    ) || [];

  useEffect(() => {
    if (!selectedExerciseId) {
      setProgressData([]);
      return;
    }
    setLoadingProgress(true);
    getExerciseProgressData(studentId, selectedExerciseId)
      .then((data) => {
        const entries: ProgressEntry[] = data.map((d) => {
          const completedSets = d.sets.filter((s) => s?.completed);
          const maxW = Math.max(...completedSets.map((s) => s.weight), 0);
          const totalR = completedSets.reduce((a, s) => a + s.reps, 0);
          const dt = new Date(d.date + "T12:00:00");
          return {
            date: d.date,
            dateLabel: dt.toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
            }),
            maxWeight: maxW,
            totalReps: totalR,
          };
        });
        setProgressData(entries);
      })
      .finally(() => setLoadingProgress(false));
  }, [selectedExerciseId, studentId, getExerciseProgressData]);

  const getTrend = (
    data: ProgressEntry[]
  ): "up" | "down" | "same" | "none" => {
    if (data.length < 2) return "none";
    const last = data[data.length - 1].maxWeight;
    const prev = data[data.length - 2].maxWeight;
    if (last > prev) return "up";
    if (last < prev) return "down";
    return "same";
  };

  const trend = getTrend(progressData);

  if (!selectedDayId) {
    return (
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Elegir dia de rutina
        </h3>
        <div className="space-y-2">
          {routine.map((day) => (
            <button
              key={day.id}
              onClick={() => setSelectedDayId(day.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:bg-secondary/30 active:scale-[0.98]"
            >
              <span className="text-2xl">{day.emoji}</span>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-foreground">
                  {day.name}
                </h4>
                <p className="text-xs text-muted-foreground">{day.subtitle}</p>
              </div>
              <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          if (selectedExerciseId) {
            setSelectedExerciseId(null);
          } else {
            setSelectedDayId(null);
          }
        }}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-primary active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        {selectedExerciseId ? selectedDay?.name : "Volver"}
      </button>

      {!selectedExerciseId ? (
        <>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Ejercicios con peso - {selectedDay?.name}
          </h3>
          {weightExercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este dia no tiene ejercicios con peso
            </p>
          ) : (
            <div className="space-y-2">
              {weightExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExerciseId(ex.id)}
                  className="flex w-full items-center gap-3 rounded-xl bg-secondary/50 p-3 text-left active:scale-[0.98]"
                >
                  <Dumbbell className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-sm font-semibold text-foreground">
                    {ex.name}
                  </span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <h3 className="mb-1 text-base font-bold text-foreground">
            {weightExercises.find((e) => e.id === selectedExerciseId)?.name}
          </h3>

          {loadingProgress ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : progressData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin datos de progreso todavia
            </p>
          ) : (
            <>
              {/* Trend */}
              <div className="mb-4 flex items-center gap-2">
                {trend === "up" && (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-medium text-green-400">
                      Subiendo peso
                    </span>
                  </>
                )}
                {trend === "down" && (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <span className="text-xs font-medium text-red-400">
                      Bajando peso
                    </span>
                  </>
                )}
                {trend === "same" && (
                  <>
                    <Minus className="h-4 w-4 text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-400">
                      Manteniendo peso
                    </span>
                  </>
                )}
              </div>

              {/* Chart */}
              {progressData.length >= 2 && (
                <div className="mb-4 h-48 w-full rounded-xl bg-card border border-border p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        width={35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="maxWeight"
                        name="Peso max (kg)"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Table */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                  <span className="flex-1">Fecha</span>
                  <span className="w-16 text-right">Peso max</span>
                  <span className="w-16 text-right">Reps tot</span>
                  <span className="w-8" />
                </div>
                {[...progressData].reverse().map((entry, i, arr) => {
                  const prev = arr[i + 1];
                  const weightDiff = prev
                    ? entry.maxWeight - prev.maxWeight
                    : 0;

                  return (
                    <div
                      key={entry.date}
                      className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2"
                    >
                      <span className="flex-1 text-xs text-foreground">
                        {entry.dateLabel}
                      </span>
                      <span className="w-16 text-right text-xs font-bold text-foreground">
                        {entry.maxWeight}kg
                      </span>
                      <span className="w-16 text-right text-xs text-muted-foreground">
                        {entry.totalReps}
                      </span>
                      <span className="w-8 text-right">
                        {weightDiff > 0 && (
                          <TrendingUp className="ml-auto h-3 w-3 text-green-400" />
                        )}
                        {weightDiff < 0 && (
                          <TrendingDown className="ml-auto h-3 w-3 text-red-400" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
