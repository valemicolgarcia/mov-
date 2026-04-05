"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Dumbbell,
  TrendingUp,
  Loader2,
  Pencil,
  Clock,
  Check,
  Timer,
  CheckSquare,
  Activity,
  Footprints,
} from "lucide-react";
import {
  workoutLogHasActivity,
  type WorkoutDay,
  type WorkoutLog,
  type SetLog,
} from "@/lib/workout-data";
import {
  useProfessorStore,
  type StudentSummary,
  type ExtraSession,
} from "@/lib/professor-store";
import { StudentCalendar } from "./student-calendar";
import { ExerciseProgress } from "./exercise-progress";
import { RoutineEditor } from "@/components/workout/routine-editor";

type Tab = "calendar" | "routine" | "progress";

interface StudentDetailProps {
  student: StudentSummary;
  onBack: () => void;
}

export function StudentDetail({ student, onBack }: StudentDetailProps) {
  const {
    getStudentRoutine,
    getStudentLogs,
    getStudentExtraSessions,
    saveStudentRoutine,
    getExerciseProgressData,
  } = useProfessorStore();
  const [tab, setTab] = useState<Tab>("calendar");
  const [routine, setRoutine] = useState<WorkoutDay[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [extras, setExtras] = useState<ExtraSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState(false);

  const loadData = useCallback(async () => {
    const [r, l, e] = await Promise.all([
      getStudentRoutine(student.id),
      getStudentLogs(student.id),
      getStudentExtraSessions(student.id),
    ]);
    setRoutine(r);
    setLogs(l);
    setExtras(e);
  }, [
    getStudentRoutine,
    getStudentLogs,
    getStudentExtraSessions,
    student.id,
  ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadData()
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const getDayName = (dayId: string): string => {
    return routine.find((d) => d.id === dayId)?.name || dayId;
  };

  const getExerciseName = (dayId: string, exerciseId: string): string => {
    const day = routine.find((d) => d.id === dayId);
    if (!day) return exerciseId;
    for (const block of day.blocks) {
      const ex = block.exercises.find((e) => e.id === exerciseId);
      if (ex) return ex.name;
    }
    return exerciseId;
  };

  const getExerciseInfo = (dayId: string, exerciseId: string) => {
    const day = routine.find((d) => d.id === dayId);
    if (!day) return null;
    for (const block of day.blocks) {
      const ex = block.exercises.find((e) => e.id === exerciseId);
      if (ex) return ex;
    }
    return null;
  };

  const selectedDayLogs = selectedDate
    ? logs.filter(
        (l) => l.date === selectedDate && workoutLogHasActivity(l)
      )
    : [];
  const selectedDayExtras = selectedDate
    ? extras.filter((e) => e.date === selectedDate)
    : [];

  if (editingRoutine) {
    return (
      <RoutineEditor
        routine={routine}
        onSave={async (days) => {
          await saveStudentRoutine(student.id, days);
          setRoutine(days);
        }}
        onImport={async (json) => {
          try {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed)) return false;
            await saveStudentRoutine(student.id, parsed);
            setRoutine(parsed);
            return true;
          } catch {
            return false;
          }
        }}
        onExport={() => JSON.stringify(routine, null, 2)}
        onBack={() => setEditingRoutine(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={selectedDate ? () => setSelectedDate(null) : onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black uppercase tracking-tight text-foreground">
                {selectedDate
                  ? new Date(selectedDate + "T12:00:00").toLocaleDateString(
                      "es-AR",
                      { weekday: "long", day: "numeric", month: "long" }
                    )
                  : student.display_name}
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedDate ? student.display_name : "Detalle del alumno"}
              </p>
            </div>
          </div>

          {/* Tabs */}
          {!selectedDate && (
            <div className="mt-3 flex rounded-xl bg-secondary p-1">
              {(
                [
                  { key: "calendar", icon: Calendar, label: "Calendario" },
                  { key: "routine", icon: Dumbbell, label: "Rutina" },
                  { key: "progress", icon: TrendingUp, label: "Progreso" },
                ] as const
              ).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                    tab === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {selectedDate ? (
          /* Day detail view */
          <div className="space-y-4">
            {selectedDayLogs.length === 0 && selectedDayExtras.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Sin actividad este dia
              </p>
            )}

            {/* Workout logs for selected date */}
            {selectedDayLogs.map((log) => (
              <div
                key={log.day_id}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center gap-3 border-b border-border bg-green-500/10 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20 text-lg">
                    {routine.find((d) => d.id === log.day_id)?.emoji || "🏋️"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {getDayName(log.day_id)}
                    </h3>
                    <p className="text-xs text-green-400">
                      Entrenamiento completado
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {Object.entries(log.exercises).map(([exId, sets]) => {
                    const exInfo = getExerciseInfo(log.day_id, exId);
                    const hasWeights = sets.some((s) => s?.weight > 0);

                    return (
                      <div
                        key={exId}
                        className="rounded-xl bg-secondary/50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          {exInfo?.isTimeBased ? (
                            <Timer className="h-3.5 w-3.5 text-blue-400" />
                          ) : exInfo?.isChecklist ? (
                            <CheckSquare className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <Dumbbell className="h-3.5 w-3.5 text-primary" />
                          )}
                          <h4 className="text-sm font-semibold text-foreground">
                            {getExerciseName(log.day_id, exId)}
                          </h4>
                        </div>
                        {hasWeights ? (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {sets
                              .filter((s) => s?.completed)
                              .map((set, i) => (
                                <span
                                  key={i}
                                  className="rounded-md bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                                >
                                  {set.weight}kg x {set.reps}
                                </span>
                              ))}
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-400" />
                            <span className="text-xs text-green-400">
                              {sets.filter((s) => s?.completed).length}x
                              completado
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Extra sessions for selected date */}
            {selectedDayExtras.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center gap-3 border-b border-border bg-blue-500/10 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                    <Activity className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {session.activity_type}
                    </h3>
                    <p className="text-xs text-blue-400">Sesion extra</p>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {session.duration_minutes && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {session.duration_minutes} minutos
                      </span>
                    </div>
                  )}
                  {session.metrics?.steps && (
                    <div className="flex items-center gap-2 text-sm">
                      <Footprints className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {session.metrics.steps.toLocaleString()} pasos
                      </span>
                    </div>
                  )}
                  {session.metrics?.distance_km && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {session.metrics.distance_km} km
                      </span>
                    </div>
                  )}
                  {session.notes && (
                    <p className="text-xs text-muted-foreground">
                      {session.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Tab content */
          <>
            {tab === "calendar" && (
              <StudentCalendar
                logs={logs}
                extraSessions={extras}
                routine={routine}
                onSelectDay={setSelectedDate}
              />
            )}

            {tab === "routine" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Rutina asignada
                  </h3>
                  <button
                    onClick={() => setEditingRoutine(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary active:scale-95"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                </div>
                {routine.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border py-12">
                    <Dumbbell className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Sin rutina asignada
                    </p>
                    <button
                      onClick={() => setEditingRoutine(true)}
                      className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground active:scale-95"
                    >
                      Asignar Rutina
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {routine.map((day) => (
                      <div
                        key={day.id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                      >
                        <span className="text-2xl">{day.emoji}</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-foreground">
                            {day.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {day.subtitle} - {day.blocks.length} bloques -{" "}
                            {day.estimatedTime} min
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "progress" && (
              <ExerciseProgress
                routine={routine}
                studentId={student.id}
                getExerciseProgressData={getExerciseProgressData}
                onBack={() => setTab("calendar")}
              />
            )}
          </>
        )}
      </div>

      <div className="h-20" />
    </motion.div>
  );
}
