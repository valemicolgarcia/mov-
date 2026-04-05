"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  type WorkoutDay,
  type WorkoutLog,
  type SetLog,
  seedWorkoutDays,
} from "@/lib/workout-data";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function useWorkoutStore() {
  const { user } = useAuth();
  const supabase = createClient();

  const [routine, setRoutine] = useState<WorkoutDay[]>([]);
  const [todayLogs, setTodayLogs] = useState<Record<string, WorkoutLog>>({});
  const [loading, setLoading] = useState(true);

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
    const { data } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", todayStr());

    if (data) {
      const logsMap: Record<string, WorkoutLog> = {};
      data.forEach((log) => {
        logsMap[log.day_id] = {
          id: log.id,
          user_id: log.user_id,
          day_id: log.day_id,
          date: log.date,
          exercises: log.exercises as Record<string, SetLog[]>,
          completed: log.completed,
        };
      });
      setTodayLogs(logsMap);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([loadRoutine(), loadTodayLogs()]).finally(() =>
      setLoading(false)
    );
  }, [user, loadRoutine, loadTodayLogs]);

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

  // Log a set (upserts the whole day log)
  const logSet = useCallback(
    async (
      dayId: string,
      exerciseId: string,
      setIndex: number,
      weight: number,
      reps: number
    ) => {
      if (!user) return;
      const date = todayStr();
      const existing = todayLogs[dayId];
      const exercises = existing?.exercises
        ? { ...existing.exercises }
        : {};

      if (!exercises[exerciseId]) {
        exercises[exerciseId] = [];
      }
      const sets = [...exercises[exerciseId]];
      sets[setIndex] = { weight, reps, completed: true };
      exercises[exerciseId] = sets;

      const logData = {
        user_id: user.id,
        day_id: dayId,
        date,
        exercises,
        completed: false,
      };

      const { data } = await supabase
        .from("workout_logs")
        .upsert(logData, { onConflict: "user_id,day_id,date" })
        .select()
        .single();

      if (data) {
        setTodayLogs((prev) => ({
          ...prev,
          [dayId]: {
            id: data.id,
            user_id: data.user_id,
            day_id: data.day_id,
            date: data.date,
            exercises: data.exercises as Record<string, SetLog[]>,
            completed: data.completed,
          },
        }));
      }
    },
    [user, supabase, todayLogs]
  );

  // Mark a checklist/timer exercise as complete
  const markExerciseComplete = useCallback(
    async (dayId: string, exerciseId: string, completed: boolean, setIndex = 0) => {
      if (!user) return;
      const date = todayStr();
      const existing = todayLogs[dayId];
      const exercises = existing?.exercises
        ? { ...existing.exercises }
        : {};

      if (!exercises[exerciseId]) {
        exercises[exerciseId] = [];
      }
      const sets = [...exercises[exerciseId]];
      sets[setIndex] = { weight: 0, reps: 0, completed };
      exercises[exerciseId] = sets;

      const logData = {
        user_id: user.id,
        day_id: dayId,
        date,
        exercises,
        completed: false,
      };

      const { data } = await supabase
        .from("workout_logs")
        .upsert(logData, { onConflict: "user_id,day_id,date" })
        .select()
        .single();

      if (data) {
        setTodayLogs((prev) => ({
          ...prev,
          [dayId]: {
            id: data.id,
            user_id: data.user_id,
            day_id: data.day_id,
            date: data.date,
            exercises: data.exercises as Record<string, SetLog[]>,
            completed: data.completed,
          },
        }));
      }
    },
    [user, supabase, todayLogs]
  );

  // Finish workout for a day
  const finishWorkout = useCallback(
    async (dayId: string) => {
      if (!user) return;
      const date = todayStr();
      const existing = todayLogs[dayId];
      if (!existing) return;

      await supabase
        .from("workout_logs")
        .update({ completed: true })
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("date", date);

      setTodayLogs((prev) => ({
        ...prev,
        [dayId]: { ...prev[dayId], completed: true },
      }));
    },
    [user, supabase, todayLogs]
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

  // Get full workout history (all past sessions)
  const getWorkoutHistory = useCallback(
    async (limit = 30) => {
      if (!user) return [];
      const { data } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("date", { ascending: false })
        .limit(limit);

      if (!data) return [];

      return data.map((log) => ({
        id: log.id,
        day_id: log.day_id,
        date: log.date,
        exercises: log.exercises as Record<string, SetLog[]>,
        completed: log.completed,
      }));
    },
    [user, supabase]
  );

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
        .select("exercises")
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

      await supabase
        .from("workout_logs")
        .update({ exercises })
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("date", date);

      if (date === todayStr()) {
        setTodayLogs((prev) => ({
          ...prev,
          [dayId]: { ...prev[dayId], exercises },
        }));
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
    saveRoutine,
    logSet,
    markExerciseComplete,
    finishWorkout,
    getExerciseHistory,
    getLastSession,
    getWorkoutHistory,
    getDayProgress,
    updateHistoryLog,
    importRoutine,
    exportRoutine,
    reload: () => Promise.all([loadRoutine(), loadTodayLogs()]),
  };
}
