"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  mergeCompletionOrder,
  workoutLogHasActivity,
  type WorkoutDay,
  type WorkoutLog,
  type SetLog,
  seedWorkoutDays,
} from "@/lib/workout-data";
import { localDateStr } from "@/lib/date-utils";

function todayStr() {
  return localDateStr();
}

function parseCompletionOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function mapWorkoutLogRow(log: {
  id: string;
  user_id: string;
  day_id: string;
  date: string;
  exercises: unknown;
  completed: boolean | null;
  completion_order?: unknown;
}): WorkoutLog {
  return {
    id: log.id,
    user_id: log.user_id,
    day_id: log.day_id,
    date: log.date,
    exercises: (log.exercises ?? {}) as Record<string, SetLog[]>,
    completion_order: parseCompletionOrder(log.completion_order),
    completed: !!log.completed,
  };
}

export function useWorkoutStore() {
  const { user } = useAuth();
  const supabase = createClient();

  const [routine, setRoutine] = useState<WorkoutDay[]>([]);
  const [todayLogs, setTodayLogs] = useState<Record<string, WorkoutLog>>({});
  const [loading, setLoading] = useState(true);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const savedTodayLogs = useRef<Record<string, WorkoutLog>>({});
  const todayLogsRef = useRef<Record<string, WorkoutLog>>({});

  useEffect(() => {
    todayLogsRef.current = todayLogs;
  }, [todayLogs]);

  // Load routine from Supabase
  const loadRoutine = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("routines")
      .select("data")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setRoutine(data.data as WorkoutDay[]);
    } else {
      // First time: seed with example data
      await supabase.from("routines").insert({
        user_id: user.id,
        data: seedWorkoutDays,
      });
      setRoutine(seedWorkoutDays);
    }
  }, [user, supabase]);

  // Load today's logs from Supabase
  const loadTodayLogs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", todayStr());

    if (error) {
      console.error("[workout_logs] loadTodayLogs:", error.message);
      return;
    }

    const logsMap: Record<string, WorkoutLog> = {};
    (data ?? []).forEach((log) => {
      logsMap[log.day_id] = mapWorkoutLogRow(log);
    });
    setTodayLogs(logsMap);
  }, [user, supabase]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const safety = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 15000);
    Promise.all([loadRoutine(), loadTodayLogs()]).finally(() => {
      clearTimeout(safety);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, [user, loadRoutine, loadTodayLogs]);

  // No recargar workout_logs al volver a la pestaña: el fetch podía traer datos viejos antes del upsert
  // y ExerciseRow pisaba los inputs. El estado sigue en memoria; saveSet persiste en Supabase.

  // Save full routine
  const saveRoutine = useCallback(
    async (days: WorkoutDay[]) => {
      if (!user) return;
      setRoutine(days);
      await supabase
        .from("routines")
        .upsert(
          { user_id: user.id, data: days, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
    },
    [user, supabase]
  );

  /** Guarda una serie (peso/reps) y si está completada; evita pisar otros ejercicios usando el último estado en ref. */
  const saveSet = useCallback(
    async (
      dayId: string,
      exerciseId: string,
      setIndex: number,
      weight: number,
      reps: number,
      completed: boolean
    ) => {
      if (!user) return;
      const date = editingDate || todayStr();
      const existing = todayLogsRef.current[dayId];
      const exercises: Record<string, SetLog[]> = existing?.exercises
        ? { ...existing.exercises }
        : {};
      if (!exercises[exerciseId]) exercises[exerciseId] = [];
      const sets = [...exercises[exerciseId]];
      while (sets.length <= setIndex) {
        sets.push({ weight: 0, reps: 0, completed: false });
      }
      sets[setIndex] = { weight, reps, completed };
      exercises[exerciseId] = sets;

      const completion_order = mergeCompletionOrder(
        existing?.completion_order,
        exerciseId,
        setIndex,
        completed
      );

      const logData = {
        user_id: user.id,
        day_id: dayId,
        date,
        exercises,
        completion_order,
        completed: existing?.completed ?? false,
      };

      const optimistic: WorkoutLog = {
        ...existing,
        ...logData,
        id: existing?.id,
        user_id: user.id,
      };
      todayLogsRef.current = { ...todayLogsRef.current, [dayId]: optimistic };
      setTodayLogs((prev) => ({ ...prev, [dayId]: optimistic }));

      const { data, error } = await supabase
        .from("workout_logs")
        .upsert(logData, { onConflict: "user_id,day_id,date" })
        .select()
        .single();

      if (error) {
        console.error("[workout_logs] saveSet:", error.message);
        return;
      }
      if (data) {
        const mapped = mapWorkoutLogRow(data);
        todayLogsRef.current = { ...todayLogsRef.current, [dayId]: mapped };
        setTodayLogs((prev) => ({ ...prev, [dayId]: mapped }));
      }
    },
    [user, supabase, editingDate]
  );

  const logSet = useCallback(
    async (
      dayId: string,
      exerciseId: string,
      setIndex: number,
      weight: number,
      reps: number
    ) => saveSet(dayId, exerciseId, setIndex, weight, reps, true),
    [saveSet]
  );

  const markExerciseComplete = useCallback(
    async (dayId: string, exerciseId: string, completed: boolean, setIndex = 0) => {
      if (!user) return;
      const date = editingDate || todayStr();
      const existing = todayLogsRef.current[dayId];
      const exercises: Record<string, SetLog[]> = existing?.exercises
        ? { ...existing.exercises }
        : {};
      if (!exercises[exerciseId]) exercises[exerciseId] = [];
      const sets = [...exercises[exerciseId]];
      while (sets.length <= setIndex) {
        sets.push({ weight: 0, reps: 0, completed: false });
      }
      sets[setIndex] = { weight: 0, reps: 0, completed };
      exercises[exerciseId] = sets;

      const completion_order = mergeCompletionOrder(
        existing?.completion_order,
        exerciseId,
        setIndex,
        completed
      );

      const logData = {
        user_id: user.id,
        day_id: dayId,
        date,
        exercises,
        completion_order,
        completed: existing?.completed ?? false,
      };

      const optimistic: WorkoutLog = {
        ...existing,
        ...logData,
        id: existing?.id,
        user_id: user.id,
      };
      todayLogsRef.current = { ...todayLogsRef.current, [dayId]: optimistic };
      setTodayLogs((prev) => ({ ...prev, [dayId]: optimistic }));

      const { data, error } = await supabase
        .from("workout_logs")
        .upsert(logData, { onConflict: "user_id,day_id,date" })
        .select()
        .single();

      if (error) {
        console.error("[workout_logs] markExerciseComplete:", error.message);
        return;
      }
      if (data) {
        const mapped = mapWorkoutLogRow(data);
        todayLogsRef.current = { ...todayLogsRef.current, [dayId]: mapped };
        setTodayLogs((prev) => ({ ...prev, [dayId]: mapped }));
      }
    },
    [user, supabase, editingDate]
  );

  // Finish workout for a day
  const finishWorkout = useCallback(
    async (dayId: string) => {
      if (!user) return;
      const date = editingDate || todayStr();
      const existing = todayLogsRef.current[dayId];
      if (!existing) return;

      const { error } = await supabase
        .from("workout_logs")
        .update({ completed: true })
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("date", date);

      if (error) {
        console.error("[workout_logs] finishWorkout:", error.message);
        return;
      }

      const next: WorkoutLog = { ...existing, completed: true };
      todayLogsRef.current = { ...todayLogsRef.current, [dayId]: next };
      setTodayLogs((prev) => ({
        ...prev,
        [dayId]: { ...prev[dayId], completed: true },
      }));
    },
    [user, supabase, editingDate]
  );

  // Get exercise history (last N sessions)
  const getExerciseHistory = useCallback(
    async (exerciseId: string, limit = 10) => {
      if (!user) return [];
      const { data } = await supabase
        .from("workout_logs")
        .select("date, exercises")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(50);

      if (!data) return [];

      const history: { date: string; sets: SetLog[] }[] = [];
      for (const log of data) {
        const ex = (log.exercises as Record<string, SetLog[]>)?.[exerciseId];
        if (ex && ex.length > 0) {
          history.push({ date: log.date, sets: ex });
          if (history.length >= limit) break;
        }
      }
      return history;
    },
    [user, supabase]
  );

  // Get last session data for an exercise (for "previous" hints)
  const getLastSession = useCallback(
    async (exerciseId: string): Promise<SetLog[] | null> => {
      if (!user) return null;
      const { data } = await supabase
        .from("workout_logs")
        .select("exercises")
        .eq("user_id", user.id)
        .lt("date", todayStr())
        .order("date", { ascending: false })
        .limit(20);

      if (!data) return null;

      for (const log of data) {
        const ex = (log.exercises as Record<string, SetLog[]>)?.[exerciseId];
        if (ex && ex.length > 0) return ex;
      }
      return null;
    },
    [user, supabase]
  );

  // Calculate day progress (% of total sets completed today)
  const getDayProgress = useCallback(
    (dayId: string): number => {
      const day = routine.find((d) => d.id === dayId);
      if (!day) return 0;
      const log = todayLogs[dayId];
      if (!log) return 0;

      let totalSets = 0;
      let completedSets = 0;

      for (const block of day.blocks) {
        for (const exercise of block.exercises) {
          totalSets += block.rounds;
          const exLog = log.exercises?.[exercise.id];
          if (exLog) {
            completedSets += exLog.filter((s) => s?.completed).length;
          }
        }
      }

      return totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);
    },
    [routine, todayLogs]
  );

  const getExtraSessions = useCallback(
    async (limit = 50): Promise<{
      data: Array<{
        id: string;
        user_id: string;
        date: string;
        activity_type: string;
        duration_minutes: number | null;
        notes: string | null;
        metrics: Record<string, number>;
        created_at?: string;
      }>;
      error: string | null;
    }> => {
      if (!user) return { data: [], error: null };
      const { data, error } = await supabase
        .from("extra_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[extra_sessions] getExtraSessions:", error.message);
        return { data: [], error: error.message };
      }
      return { data: data ?? [], error: null };
    },
    [user, supabase]
  );

  /** Elimina una fila de workout_logs (historial del alumno) */
  const deleteWorkoutSession = useCallback(
    async (log: { id?: string; day_id: string; date: string }) => {
      if (!user) return { error: "No hay usuario" };
      let error: { message: string } | null = null;
      if (log.id) {
        const r = await supabase
          .from("workout_logs")
          .delete()
          .eq("id", log.id)
          .eq("user_id", user.id);
        error = r.error;
      } else {
        const r = await supabase
          .from("workout_logs")
          .delete()
          .eq("user_id", user.id)
          .eq("day_id", log.day_id)
          .eq("date", log.date);
        error = r.error;
      }
      if (error) {
        console.error("[workout_logs] delete:", error.message);
        return { error: error.message };
      }
      if (log.date === todayStr()) {
        await loadTodayLogs();
      }
      return { error: null };
    },
    [user, supabase, loadTodayLogs]
  );

  const deleteExtraSession = useCallback(
    async (sessionId: string) => {
      if (!user) return { error: "No hay usuario" };
      const { error } = await supabase
        .from("extra_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", user.id);
      if (error) {
        console.error("[extra_sessions] delete:", error.message);
        return { error: error.message };
      }
      return { error: null };
    },
    [user, supabase]
  );

  // Get full workout history (all past sessions)
  const getWorkoutHistory = useCallback(
    async (limit = 30) => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(limit * 2);

      if (error) {
        console.error("[workout_logs] getWorkoutHistory:", error.message);
        return [];
      }
      if (!data) return [];

      const rows = data.filter((log) =>
        workoutLogHasActivity({
          completed: log.completed,
          exercises: log.exercises as Record<string, SetLog[]>,
        })
      );

      return rows.slice(0, limit).map((log) => mapWorkoutLogRow(log));
    },
    [user, supabase]
  );

  // Enter history editing mode: loads a past date's log into todayLogs
  const startEditingHistory = useCallback(
    async (dayId: string, date: string) => {
      if (!user) return;
      savedTodayLogs.current = todayLogs;

      const { data } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("date", date)
        .maybeSingle();

      if (data) {
        const mapped = mapWorkoutLogRow(data);
        todayLogsRef.current = { [dayId]: mapped };
        setTodayLogs({ [dayId]: mapped });
      } else {
        todayLogsRef.current = {};
        setTodayLogs({});
      }

      setEditingDate(date);
    },
    [user, supabase, todayLogs]
  );

  // Exit history editing mode: restore today's actual logs
  const stopEditingHistory = useCallback(async () => {
    setEditingDate(null);
    const restored = savedTodayLogs.current;
    savedTodayLogs.current = {};
    todayLogsRef.current = restored;
    setTodayLogs(restored);
    await loadTodayLogs();
  }, [loadTodayLogs]);

  // Update a specific exercise's sets in a past workout log
  const updateHistoryLog = useCallback(
    async (
      dayId: string,
      date: string,
      exerciseId: string,
      setIndex: number,
      weight: number,
      reps: number
    ) => {
      if (!user) return;

      const { data: existing } = await supabase
        .from("workout_logs")
        .select("exercises, completion_order")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("date", date)
        .single();

      if (!existing) return;

      const exercises = {
        ...(existing.exercises as Record<string, SetLog[]>),
      };
      if (!exercises[exerciseId]) exercises[exerciseId] = [];
      const sets = [...exercises[exerciseId]];
      sets[setIndex] = { weight, reps, completed: true };
      exercises[exerciseId] = sets;

      const completion_order = mergeCompletionOrder(
        parseCompletionOrder(existing.completion_order),
        exerciseId,
        setIndex,
        true
      );

      await supabase
        .from("workout_logs")
        .update({ exercises, completion_order })
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("date", date);

      if (date === todayStr()) {
        setTodayLogs((prev) => {
          const cur = prev[dayId];
          if (!cur) return prev;
          const merged: WorkoutLog = {
            ...cur,
            exercises,
            completion_order,
          };
          todayLogsRef.current = { ...todayLogsRef.current, [dayId]: merged };
          return { ...prev, [dayId]: merged };
        });
      }
    },
    [user, supabase]
  );

  // Import routine from JSON
  const importRoutine = useCallback(
    async (json: string): Promise<boolean> => {
      try {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) return false;
        await saveRoutine(parsed);
        return true;
      } catch {
        return false;
      }
    },
    [saveRoutine]
  );

  // Export routine as JSON string
  const exportRoutine = useCallback(() => {
    return JSON.stringify(routine, null, 2);
  }, [routine]);

  return {
    routine,
    loading,
    todayLogs,
    editingDate,
    saveRoutine,
    saveSet,
    logSet,
    markExerciseComplete,
    finishWorkout,
    getExerciseHistory,
    getLastSession,
    getWorkoutHistory,
    getExtraSessions,
    deleteWorkoutSession,
    deleteExtraSession,
    getDayProgress,
    startEditingHistory,
    stopEditingHistory,
    updateHistoryLog,
    importRoutine,
    exportRoutine,
    reload: () => Promise.all([loadRoutine(), loadTodayLogs()]),
  };
}
