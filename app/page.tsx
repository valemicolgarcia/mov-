"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { DaysList } from "@/components/workout/days-list";
import { WorkoutDetail } from "@/components/workout/workout-detail";
import { RoutineEditor } from "@/components/workout/routine-editor";
import { WorkoutHistory } from "@/components/workout/workout-history";
import { ExtraSessionForm } from "@/components/workout/extra-session-form";
import { ProfessorDashboard } from "@/components/professor/dashboard";
import { StudentDetail } from "@/components/professor/student-detail";
import { useWorkoutStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import type { StudentSummary } from "@/lib/professor-store";
import { Loader2 } from "lucide-react";
import { UserProfileScreen } from "@/components/profile/user-profile-screen";

type StudentView =
  | "list"
  | "detail"
  | "editor"
  | "history"
  | "extra"
  | "profile";
type ProfessorView = "dashboard" | "student-detail" | "profile";

export default function Home() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const store = useWorkoutStore();
  const router = useRouter();

  const [studentView, setStudentView] = useState<StudentView>("list");
  const [professorView, setProfessorView] = useState<ProfessorView>("dashboard");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(
    null
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const selectedDay = selectedDayId
    ? store.routine.find((d) => d.id === selectedDayId)
    : null;

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">
          No pudimos cargar tu perfil. Revisa la conexion o la configuracion de Supabase.
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Cerrar sesion
        </button>
      </div>
    );
  }

  // ---- PROFESSOR VIEW ----
  if (profile.role === "professor") {
    return (
      <main className="min-h-screen bg-background">
        <AnimatePresence mode="wait">
          {professorView === "profile" ? (
            <UserProfileScreen
              key="profile"
              onBack={() => setProfessorView("dashboard")}
            />
          ) : professorView === "student-detail" && selectedStudent ? (
            <StudentDetail
              key="student-detail"
              student={selectedStudent}
              onBack={() => {
                setSelectedStudent(null);
                setProfessorView("dashboard");
              }}
            />
          ) : (
            <ProfessorDashboard
              key="dashboard"
              professorName={profile.display_name}
              onSelectStudent={(s) => {
                setSelectedStudent(s);
                setProfessorView("student-detail");
              }}
              onOpenProfile={() => setProfessorView("profile")}
              onSignOut={signOut}
            />
          )}
        </AnimatePresence>
      </main>
    );
  }

  // ---- STUDENT VIEW ----
  if (store.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleEditSession = async (dayId: string, date: string) => {
    await store.startEditingHistory(dayId, date);
    setSelectedDayId(dayId);
    setStudentView("detail");
  };

  const handleBackFromDetail = async () => {
    if (store.editingDate) {
      await store.stopEditingHistory();
      setSelectedDayId(null);
      setStudentView("history");
    } else {
      setSelectedDayId(null);
      setStudentView("list");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {studentView === "editor" ? (
          <RoutineEditor
            key="editor"
            routine={store.routine}
            onSave={store.saveRoutine}
            onImport={store.importRoutine}
            onExport={store.exportRoutine}
            onBack={() => {
              store.reload();
              setStudentView("list");
            }}
          />
        ) : studentView === "history" ? (
          <WorkoutHistory
            key="history"
            store={store}
            onBack={() => setStudentView("list")}
            onEditSession={handleEditSession}
          />
        ) : studentView === "extra" ? (
          <ExtraSessionForm
            key="extra"
            onBack={() => setStudentView("list")}
            onSaved={() => setStudentView("list")}
          />
        ) : studentView === "profile" ? (
          <UserProfileScreen
            key="profile"
            onBack={() => setStudentView("list")}
          />
        ) : studentView === "detail" && selectedDay ? (
          <WorkoutDetail
            key={`detail-${store.editingDate || "today"}`}
            day={selectedDay}
            store={store}
            onBack={handleBackFromDetail}
          />
        ) : (
          <DaysList
            key="list"
            routine={store.routine}
            getDayProgress={store.getDayProgress}
            onSelectDay={(id) => {
              setSelectedDayId(id);
              setStudentView("detail");
            }}
            onEditRoutine={() => setStudentView("editor")}
            onViewHistory={() => setStudentView("history")}
            onAddExtra={() => setStudentView("extra")}
            onOpenProfile={() => setStudentView("profile")}
            onSignOut={signOut}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
