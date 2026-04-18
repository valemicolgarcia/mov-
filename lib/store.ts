"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
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

/** "Score" de cuánta data tiene un log — usado para decidir si server o local gana al sincronizar. */
function scoreLog(log: Pick<WorkoutLog, "exercises">): number {
  let score = 0;
  const ex = log.exercises;
  if (!ex) return 0;
  for (const sets of Object.values(ex)) {
    if (!Array.isArray(sets)) continue;
    for (const s of sets) {
      if (!s) continue;
      if (s.completed) score += 10;
      if ((Number(s.weight) || 0) > 0) score += 3;
      if ((Number(s.reps) || 0) > 0) score += 3;
    }
  }
  return score;
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

// Persistencia de sesión: sobrevive al cambio de tab y re-mounts del provider.
// Clave distinta por usuario para no mezclar datos entre cuentas.
const SESSION_KEY_PREFIX = "mov:session:";
function sessionKey(userId: string) {
  return `${SESSION_KEY_PREFIX}${userId}`;
}

interface PersistedSession {
  todayLogs: Record<string, WorkoutLog>;
  editingDate: string | null;
  /** Día (YYYY-MM-DD) al que corresponden estos todayLogs; si el usuario vuelve otro día, se descarta. */
  todayDate: string;
}

function loadPersisted(userId: string): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    // Si cambió el día, descartamos los todayLogs (no editingDate, podría estar editando historial).
    if (parsed.editingDate == null && parsed.todayDate !== todayStr()) {
      return { ...parsed, todayLogs: {} };
    }
    return parsed;
  } catch {
    return null;
  }
}

function savePersisted(userId: string, s: PersistedSession) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(sessionKey(userId), JSON.stringify(s));
  } catch {
    /* quota / disabled */
  }
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
  /** Fecha del log que estamos editando (historial); sincronizada antes que React state para saveSet/loads. */
  const editingDateRef = useRef<string | null>(null);
  /** Cola por dayId — encadena upserts para evitar race conditions (lost updates). */
  const saveQueueRef = useRef<Record<string, Promise<void>>>({});
  /** Ya intentamos hidratar desde sessionStorage (una vez por mount). */
  const hydratedRef = useRef(false);

  useEffect(() => {
    todayLogsRef.current = todayLogs;
  }, [todayLogs]);

  useEffect(() => {
    editingDateRef.current = editingDate;
  }, [editingDate]);

  // Hidratar desde sessionStorage al montar (o al cambiar de usuario).
  useEffect(() => {
    if (!user) {
      hydratedRef.current = false;
      return;
    }
    if (hydratedRef.current) return;
    const persisted = loadPersisted(user.id);
    if (persisted) {
      todayLogsRef.current = persisted.todayLogs;
      setTodayLogs(persisted.todayLogs);
      if (persisted.editingDate) {
        editingDateRef.current = persisted.editingDate;
        setEditingDate(persisted.editingDate);
      }
    }
    hydratedRef.current = true;
  }, [user]);

  // Persistir cambios en todayLogs / editingDate.
  useEffect(() => {
    if (!user || !hydratedRef.current) return;
    savePersisted(user.id, {
      todayLogs,
      editingDate,
      todayDate: todayStr(),
    });
  }, [user, todayLogs, editingDate]);

  const activeLogDate = useCallback(() => {
    return editingDateRef.current ?? todayStr();
  }, []);

  // Load routine from Supabase
  const loadRoutine = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("routines")
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[routines] loadRoutine:", error.message);
      toast.error("No se pudo cargar tu rutina", { description: error.message });
      return;
    }

    if (data) {
      setRoutine(data.data as WorkoutDay[]);
    } else {
      const { error: insertError } = await supabase.from("routines").insert({
        user_id: user.id,
        data: seedWorkoutDays,
      });
      if (insertError) {
        console.error("[routines] seed:", insertError.message);
        toast.error("No se pudo inicializar tu rutina", {
          description: insertError.message,
        });
        return;
      }
      setRoutine(seedWorkoutDays);
    }
  }, [user, supabase]);

  // Load today's logs from Supabase (solo día actual). No pisar estado si estamos editando una fecha pasada.
  const loadTodayLogs = useCallback(async () => {
    if (!user) return;
    if (editingDateRef.current !== null) return;

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
    // Merge: preservar datos locales si son más "ricos" que los del server.
    // "Más ricos" = más sets con peso/reps/completed. Esto evita que al volver al tab
    // el server (con datos viejos aún no sincronizados) pise lo que el usuario acaba de escribir.
    setTodayLogs((prev) => {
      const merged: Record<string, WorkoutLog> = { ...prev };
      for (const [dayId, serverLog] of Object.entries(logsMap)) {
        const localLog = merged[dayId];
        if (!localLog) {
          merged[dayId] = serverLog;
          continue;
        }
        // Si el server confirmó completed=true o tiene id (row real), tiene autoridad en esos campos,
        // pero preservamos los exercises locales si tienen más data.
        const localScore = scoreLog(localLog);
        const serverScore = scoreLog(serverLog);
        merged[dayId] = {
          ...serverLog,
          ...(localScore > serverScore
            ? {
                exercises: localLog.exercises,
                completion_order: localLog.completion_order,
              }
            : {}),
          // `completed` del server siempre gana (es una acción explícita que requiere upsert separado).
          completed: serverLog.completed,
        };
      }
      todayLogsRef.current = merged;
      return merged;
    });
  }, [user, supabase]);

  /** Un solo día (fecha = entreno actual o historial). */
  const refreshDayLog = useCallback(
    async (dayId: string) => {
      if (!user) return;
      const date = activeLogDate();
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("date", date)
        .maybeSingle();

      if (error) {
        console.error("[workout_logs] refreshDayLog:", error.message);
        return;
      }
      if (!data) return;

      const mapped = mapWorkoutLogRow(data);
      todayLogsRef.current = { ...todayLogsRef.current, [dayId]: mapped };
      setTodayLogs((prev) => ({ ...prev, [dayId]: mapped }));
    },
    [user, supabase, activeLogDate]
  );

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

  // Save full routine
  const saveRoutine = useCallback(
    async (days: WorkoutDay[]) => {
      if (!user) return;
      setRoutine(days);
      const { error } = await supabase
        .from("routines")
        .upsert(
          { user_id: user.id, data: days, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) {
        console.error("[routines] saveRoutine:", error.message);
        toast.error("No se pudo guardar la rutina", {
          description: error.message,
        });
      }
    },
    [user, supabase]
  );

  /** Encola una operación de guardado por día — evita concurrencia que pisa el JSON `exercises`. */
  const enqueueSave = useCallback(
    (dayId: string, task: () => Promise<void>): Promise<void> => {
      const prev = saveQueueRef.current[dayId] ?? Promise.resolve();
      const next = prev.catch(() => {}).then(task);
      saveQueueRef.current[dayId] = next;
      // Limpieza: si esta es la última, borrá la referencia al terminar.
      next.finally(() => {
        if (saveQueueRef.current[dayId] === next) {
          delete saveQueueRef.current[dayId];
        }
      });
      return next;
    },
    []
  );

  /** Update optimístico local (sin Supabase). Llamado en cada keystroke para que sessionStorage tenga el dato antes del debounce. */
  const updateSetLocal = useCallback(
    (
      dayId: string,
      exerciseId: string,
      setIndex: number,
      weight: number,
      reps: number,
      completed: boolean
    ) => {
      if (!user) return;
      const date = activeLogDate();
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

      const next: WorkoutLog = {
        ...existing,
        user_id: user.id,
        day_id: dayId,
        date,
        exercises,
        completion_order,
        completed: existing?.completed ?? false,
      };
      todayLogsRef.current = { ...todayLogsRef.current, [dayId]: next };
      setTodayLogs((prev) => ({ ...prev, [dayId]: next }));
    },
    [user, activeLogDate]
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
      return enqueueSave(dayId, async () => {
        const date = activeLogDate();
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
          toast.error("No se guardó la serie", {
            description: error.message,
            id: `save-error-${dayId}`,
          });
          return;
        }
        if (!data) {
          console.error("[workout_logs] saveSet: respuesta vacía (RLS?)");
          toast.error("No se guardó la serie", {
            description: "El servidor no confirmó la escritura. Revisá tu conexión.",
            id: `save-error-${dayId}`,
          });
          return;
        }
        const mapped = mapWorkoutLogRow(data);
        todayLogsRef.current = { ...todayLogsRef.current, [dayId]: mapped };
        setTodayLogs((prev) => ({ ...prev, [dayId]: mapped }));
      });
    },
    [user, supabase, activeLogDate, enqueueSave]
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
      return enqueueSave(dayId, async () => {
        const date = activeLogDate();
        const existing = todayLogsRef.current[dayId];
        const exercises: Record<string, SetLog[]> = existing?.exercises
          ? { ...existing.exercises }
          : {};
        if (!exercises[exerciseId]) exercises[exerciseId] = [];
        const sets = [...exercises[exerciseId]];
        while (sets.length <= setIndex) {
          sets.push({ weight: 0, reps: 0, completed: false });
        }
        // Preservar weight/reps si ya había (para timer/checklist son 0; para normales no se llama desde acá).
        const prev = sets[setIndex];
        sets[setIndex] = {
          weight: prev?.weight ?? 0,
          reps: prev?.reps ?? 0,
          completed,
        };
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
          toast.error("No se marcó como completado", {
            description: error.message,
            id: `complete-error-${dayId}`,
          });
          return;
        }
        if (!data) {
          console.error("[workout_logs] markExerciseComplete: respuesta vacía");
          toast.error("No se marcó como completado", {
            description: "El servidor no confirmó la escritura.",
            id: `complete-error-${dayId}`,
          });
          return;
        }
        const mapped = mapWorkoutLogRow(data);
        todayLogsRef.current = { ...todayLogsRef.current, [dayId]: mapped };
        setTodayLogs((prev) => ({ ...prev, [dayId]: mapped }));
      });
    },
    [user, supabase, activeLogDate, enqueueSave]
  );

  // Finish workout for a day — esperamos la cola primero para no pisar cambios pendientes.
  const finishWorkout = useCallback(
    async (dayId: string) => {
      if (!user) return;
      return enqueueSave(dayId, async () => {
        const date = activeLogDate();
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
          toast.error("No se pudo finalizar el entrenamiento", {
            description: error.message,
          });
          return;
        }

        const next: WorkoutLog = { ...existing, completed: true };
        todayLogsRef.current = { ...todayLogsRef.current, [dayId]: next };
        setTodayLogs((prev) => ({
          ...prev,
          [dayId]: { ...prev[dayId], completed: true },
        }));
      });
    },
    [user, supabase, activeLogDate, enqueueSave]
  );

  // Get exercise history (last N sessions)
  const getExerciseHistory = useCallback(
    async (exerciseId: string, limit = 10) => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("workout_logs")
        .select("date, exercises")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[workout_logs] getExerciseHistory:", error.message);
        return [];
      }
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
      const { data, error } = await supabase
        .from("workout_logs")
        .select("exercises")
        .eq("user_id", user.id)
        .lt("date", todayStr())
        .order("date", { ascending: false })
        .limit(20);

      if (error) {
        console.error("[workout_logs] getLastSession:", error.message);
        return null;
      }
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
        toast.error("No se pudo borrar la sesión", { description: error.message });
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
        toast.error("No se pudo borrar la actividad", {
          description: error.message,
        });
        return { error: error.message };
      }
      return { error: null };
    },
    [user, supabase]
  );

  // Get full workout history (all past sessions) — filtra borradores sin sets completados.
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
      editingDateRef.current = date;
      setEditingDate(date);

      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("date", date)
        .maybeSingle();

      if (error) {
        console.error("[workout_logs] startEditingHistory:", error.message);
        toast.error("No se pudo cargar la sesión", { description: error.message });
      }

      if (data) {
        const mapped = mapWorkoutLogRow(data);
        todayLogsRef.current = { [dayId]: mapped };
        setTodayLogs({ [dayId]: mapped });
      } else {
        todayLogsRef.current = {};
        setTodayLogs({});
      }
    },
    [user, supabase, todayLogs]
  );

  // Exit history editing mode: restore today's actual logs
  const stopEditingHistory = useCallback(async () => {
    editingDateRef.current = null;
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

      const { data: existing, error: selectError } = await supabase
        .from("workout_logs")
        .select("exercises, completion_order")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("date", date)
        .maybeSingle();

      if (selectError) {
        console.error("[workout_logs] updateHistoryLog select:", selectError.message);
        toast.error("No se pudo cargar la sesión", {
          description: selectError.message,
        });
        return;
      }
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

      const { error: updateError } = await supabase
        .from("workout_logs")
        .update({ exercises, completion_order })
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("date", date);

      if (updateError) {
        console.error("[workout_logs] updateHistoryLog update:", updateError.message);
        toast.error("No se pudo actualizar la sesión", {
          description: updateError.message,
        });
        return;
      }

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
    updateSetLocal,
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
    refreshDayLog,
    reload: () => Promise.all([loadRoutine(), loadTodayLogs()]),
  };
}
