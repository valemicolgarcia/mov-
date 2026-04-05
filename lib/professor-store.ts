"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import type { WorkoutDay, WorkoutLog, SetLog } from "@/lib/workout-data";

export interface ExtraSession {
  id: string;
  user_id: string;
  date: string;
  activity_type: string;
  duration_minutes: number | null;
  notes: string | null;
  metrics: Record<string, number>;
  created_at: string;
}

export interface StudentSummary extends UserProfile {
  email?: string;
  lastWorkoutDate?: string;
  completedThisWeek: number;
  completedThisMonth: number;
}

export function useProfessorStore() {
  const { user } = useAuth();
  const supabase = createClient();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStudents = useCallback(async () => {
    if (!user) return;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, role, professor_id")
      .eq("professor_id", user.id);

    if (!profiles) {
      setStudents([]);
      return;
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const studentIds = profiles.map((p) => p.id);

    const { data: logs } = await supabase
      .from("workout_logs")
      .select("user_id, date, completed")
      .in("user_id", studentIds)
      .eq("completed", true)
      .gte("date", monthStart.toISOString().split("T")[0])
      .order("date", { ascending: false });

    const summaries: StudentSummary[] = profiles.map((p) => {
      const userLogs = logs?.filter((l) => l.user_id === p.id) || [];
      const weekStr = weekStart.toISOString().split("T")[0];

      return {
        ...p,
        role: p.role as "professor" | "student",
        completedThisWeek: userLogs.filter((l) => l.date >= weekStr).length,
        completedThisMonth: userLogs.length,
        lastWorkoutDate: userLogs[0]?.date,
      };
    });

    setStudents(summaries);
  }, [user, supabase]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadStudents().finally(() => setLoading(false));
  }, [user, loadStudents]);

  const getStudentRoutine = useCallback(
    async (studentId: string): Promise<WorkoutDay[]> => {
      const { data } = await supabase
        .from("routines")
        .select("data")
        .eq("user_id", studentId)
        .single();
      return (data?.data as WorkoutDay[]) || [];
    },
    [supabase]
  );

  const saveStudentRoutine = useCallback(
    async (studentId: string, days: WorkoutDay[]) => {
      await supabase
        .from("routines")
        .upsert(
          {
            user_id: studentId,
            data: days,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    },
    [supabase]
  );

  const getStudentLogs = useCallback(
    async (studentId: string, limit = 100): Promise<WorkoutLog[]> => {
      const { data } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", studentId)
        .order("date", { ascending: false })
        .limit(limit);

      if (!data) return [];

      return data.map((log) => ({
        id: log.id,
        user_id: log.user_id,
        day_id: log.day_id,
        date: log.date,
        exercises: log.exercises as Record<string, SetLog[]>,
        completed: log.completed,
      }));
    },
    [supabase]
  );

  const getStudentExtraSessions = useCallback(
    async (studentId: string, limit = 50): Promise<ExtraSession[]> => {
      const { data } = await supabase
        .from("extra_sessions")
        .select("*")
        .eq("user_id", studentId)
        .order("date", { ascending: false })
        .limit(limit);

      return (data as ExtraSession[]) || [];
    },
    [supabase]
  );

  const getExerciseProgressData = useCallback(
    async (
      studentId: string,
      exerciseId: string
    ): Promise<{ date: string; sets: SetLog[] }[]> => {
      const { data } = await supabase
        .from("workout_logs")
        .select("date, exercises")
        .eq("user_id", studentId)
        .order("date", { ascending: true })
        .limit(100);

      if (!data) return [];

      const results: { date: string; sets: SetLog[] }[] = [];
      for (const log of data) {
        const ex = (log.exercises as Record<string, SetLog[]>)?.[exerciseId];
        if (ex && ex.length > 0 && ex.some((s) => s?.completed)) {
          results.push({ date: log.date, sets: ex });
        }
      }
      return results;
    },
    [supabase]
  );

  return {
    students,
    loading,
    reload: loadStudents,
    getStudentRoutine,
    saveStudentRoutine,
    getStudentLogs,
    getStudentExtraSessions,
    getExerciseProgressData,
  };
}
