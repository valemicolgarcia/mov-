"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  Check,
  Play,
  Pause,
  RotateCcw,
  Minus,
  Plus,
  TrendingUp,
} from "lucide-react";
import type { Exercise, SetLog } from "@/lib/workout-data";
import type { useWorkoutStore } from "@/lib/store";
import { ExerciseHistory } from "./exercise-history";

interface ExerciseRowProps {
  exercise: Exercise;
  setIndex: number;
  dayId: string;
  store: ReturnType<typeof useWorkoutStore>;
  roundLabel?: number;
}

export function ExerciseRow({ exercise, setIndex, dayId, store, roundLabel }: ExerciseRowProps) {
  const dayLog = store.todayLogs[dayId];
  const savedSets = dayLog?.exercises?.[exercise.id];
  const savedSet = savedSets?.[setIndex];

  const [weight, setWeight] = useState<string>(
    savedSet?.weight ? savedSet.weight.toString() : ""
  );
  const [reps, setReps] = useState<string>(
    savedSet?.reps ? savedSet.reps.toString() : ""
  );
  const [isChecked, setIsChecked] = useState(savedSet?.completed ?? false);
  const [timeLeft, setTimeLeft] = useState(exercise.targetTime || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [previousSets, setPreviousSets] = useState<SetLog[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const inputsFocusedRef = useRef(false);
  /** Hay edición local que aún no coincide con lo último del servidor (evita pisar con datos viejos al re-fetch). */
  const pendingLocalRef = useRef(false);
  const isCheckedRef = useRef(isChecked);
  isCheckedRef.current = isChecked;

  const savedSnap =
    savedSet != null
      ? `${savedSet.weight}-${savedSet.reps}-${savedSet.completed}`
      : "";

  const localMatchesSaved = useCallback(() => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (!savedSet) return w === 0 && r === 0 && !isChecked;
    return (
      w === savedSet.weight &&
      r === savedSet.reps &&
      isChecked === savedSet.completed
    );
  }, [weight, reps, isChecked, savedSet]);

  useEffect(() => {
    if (inputsFocusedRef.current) return;
    if (pendingLocalRef.current && !localMatchesSaved()) return;
    if (localMatchesSaved()) pendingLocalRef.current = false;
    setWeight(savedSet?.weight ? String(savedSet.weight) : "");
    setReps(savedSet?.reps ? String(savedSet.reps) : "");
    setIsChecked(savedSet?.completed ?? false);
  }, [savedSnap, exercise.id, setIndex, dayId, localMatchesSaved]);

  // Borrador en Supabase mientras editás peso/reps (no hace falta tocar el tilde para no perder datos al cambiar de app)
  useEffect(() => {
    if (exercise.isChecklist || exercise.isTimeBased) return;
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    const sw = savedSet?.weight ?? 0;
    const sr = savedSet?.reps ?? 0;
    const sc = savedSet?.completed ?? false;
    if (w === sw && r === sr && isCheckedRef.current === sc) return;
    const t = setTimeout(() => {
      void store.saveSet(
        dayId,
        exercise.id,
        setIndex,
        w,
        r,
        isCheckedRef.current
      );
    }, 300);
    return () => clearTimeout(t);
  }, [
    weight,
    reps,
    savedSnap,
    dayId,
    exercise.id,
    setIndex,
    exercise.isChecklist,
    exercise.isTimeBased,
    store,
  ]);

  useEffect(() => {
    if (exercise.isChecklist || exercise.isTimeBased) return;
    const flush = () => {
      if (document.visibilityState !== "hidden") return;
      const w = parseFloat(weight) || 0;
      const r = parseInt(reps, 10) || 0;
      void store.saveSet(dayId, exercise.id, setIndex, w, r, isCheckedRef.current);
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [weight, reps, dayId, exercise.id, setIndex, exercise.isChecklist, exercise.isTimeBased, store]);

  // Load previous session data
  useEffect(() => {
    store.getLastSession(exercise.id).then((data) => {
      if (data) setPreviousSets(data);
    });
  }, [exercise.id, store]);

  useEffect(() => {
    if (!exercise.isTimeBased) return;
    if (savedSet?.completed) {
      setIsChecked(true);
      setTimeLeft(0);
      setIsRunning(false);
    }
  }, [exercise.isTimeBased, savedSnap]);

  const previousSet = previousSets?.[setIndex];

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setIsChecked(true);
      store.markExerciseComplete(dayId, exercise.id, true, setIndex);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, dayId, exercise.id, store]);

  const resetTimer = useCallback(() => {
    setTimeLeft(exercise.targetTime || 0);
    setIsRunning(false);
    setIsChecked(false);
  }, [exercise.targetTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const adjustValue = (
    current: string,
    delta: number,
    setter: (val: string) => void
  ) => {
    pendingLocalRef.current = true;
    const num = parseFloat(current) || 0;
    const newVal = Math.max(0, num + delta);
    setter(newVal.toString());
  };

  const handleComplete = () => {
    const newChecked = !isChecked;
    setIsChecked(newChecked);

    if (exercise.isChecklist || exercise.isTimeBased) {
      store.markExerciseComplete(dayId, exercise.id, newChecked, setIndex);
    } else {
      pendingLocalRef.current = true;
      const w = parseFloat(weight) || 0;
      const r = parseInt(reps, 10) || 0;
      void store.saveSet(dayId, exercise.id, setIndex, w, r, newChecked);
    }
  };

  // Timer-based exercise
  if (exercise.isTimeBased) {
    const progress = exercise.targetTime
      ? ((exercise.targetTime - timeLeft) / exercise.targetTime) * 100
      : 0;

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative overflow-hidden rounded-xl bg-secondary/50 p-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground">{exercise.name}</h4>
              {exercise.videoUrl && (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {exercise.notes && (
              <p className="mt-1 text-xs text-muted-foreground">
                {exercise.notes}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={176} strokeDashoffset={176 - (progress / 100) * 176} className="text-primary transition-all duration-300" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-bold tabular-nums">
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-95"
              >
                {isRunning ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 translate-x-0.5" />
                )}
              </button>
              <button
                onClick={resetTimer}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-transform active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isChecked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <Check className="h-6 w-6 text-primary-foreground" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Checklist exercise
  if (exercise.isChecklist) {
    return (
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleComplete}
        className={`flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all ${
          isChecked
            ? "bg-primary/20 border border-primary/30"
            : "bg-secondary/50"
        }`}
      >
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
            isChecked
              ? "border-primary bg-primary"
              : "border-muted-foreground/30"
          }`}
        >
          {isChecked && <Check className="h-4 w-4 text-primary-foreground" />}
        </div>
        <div className="flex-1">
          <h4
            className={`font-semibold transition-all ${
              isChecked
                ? "text-muted-foreground line-through"
                : "text-foreground"
            }`}
          >
            {exercise.name}
          </h4>
          <p className="text-xs text-muted-foreground">{exercise.targetReps}</p>
        </div>
        {exercise.videoUrl && (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </motion.button>
    );
  }

  // Standard exercise with weight/reps inputs
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-xl bg-secondary/50 p-4"
      >
        {/* Exercise header */}
        <div className="mb-2 flex items-center gap-2">
          <h4 className="font-semibold text-foreground">{exercise.name}</h4>
          {exercise.videoUrl && (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={() => setShowHistory(true)}
            className="ml-1 text-muted-foreground transition-colors hover:text-primary"
            title="Ver historial"
          >
            <TrendingUp className="h-3.5 w-3.5" />
          </button>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {roundLabel != null && (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary">
                V{roundLabel}
              </span>
            )}
            <span>Obj: {exercise.targetReps}</span>
          </div>
        </div>

        {/* Previous session reference */}
        {previousSet && previousSet.weight > 0 && (
          <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              Anterior: {previousSet.weight}kg × {previousSet.reps} reps
            </span>
          </div>
        )}

        {/* Inputs */}
        <div className="flex items-center gap-3">

          {/* Weight input */}
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              Peso (kg)
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustValue(weight, -2.5, setWeight)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => {
                  pendingLocalRef.current = true;
                  setWeight(e.target.value);
                }}
                onFocus={() => {
                  inputsFocusedRef.current = true;
                }}
                onBlur={() => {
                  inputsFocusedRef.current = false;
                }}
                placeholder={previousSet?.weight ? previousSet.weight.toString() : "0"}
                className="h-10 w-full rounded-lg bg-background px-3 text-center text-lg font-bold tabular-nums text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => adjustValue(weight, 2.5, setWeight)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Reps input */}
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              Reps
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustValue(reps, -1, setReps)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => {
                  pendingLocalRef.current = true;
                  setReps(e.target.value);
                }}
                onFocus={() => {
                  inputsFocusedRef.current = true;
                }}
                onBlur={() => {
                  inputsFocusedRef.current = false;
                }}
                placeholder={previousSet?.reps ? previousSet.reps.toString() : "0"}
                className="h-10 w-full rounded-lg bg-background px-3 text-center text-lg font-bold tabular-nums text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => adjustValue(reps, 1, setReps)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Check button */}
          <button
            onClick={handleComplete}
            className={`mt-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all active:scale-95 ${
              isChecked
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-primary/20"
            }`}
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      </motion.div>

      {/* History modal */}
      <AnimatePresence>
        {showHistory && (
          <ExerciseHistory
            exerciseName={exercise.name}
            getHistory={() => store.getExerciseHistory(exercise.id)}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
