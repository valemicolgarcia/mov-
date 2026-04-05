"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { DaysList } from "@/components/workout/days-list";
import { WorkoutDetail } from "@/components/workout/workout-detail";
import { RoutineEditor } from "@/components/workout/routine-editor";
import { WorkoutHistory } from "@/components/workout/workout-history";
import { useWorkoutStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

type View = "list" | "detail" | "editor" | "history";

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const store = useWorkoutStore();
  const router = useRouter();
  const [view, setView] = useState<View>("list");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const selectedDay = selectedDayId
    ? store.routine.find((d) => d.id === selectedDayId)
    : null;

  if (authLoading || store.loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleEditSession = async (dayId: string, date: string) => {
    await store.startEditingHistory(dayId, date);
    setSelectedDayId(dayId);
    setView("detail");
  };

  const handleBackFromDetail = async () => {
    if (store.editingDate) {
      await store.stopEditingHistory();
      setSelectedDayId(null);
      setView("history");
    } else {
      setSelectedDayId(null);
      setView("list");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {view === "editor" ? (
          <RoutineEditor
            key="editor"
            routine={store.routine}
            onSave={store.saveRoutine}
            onImport={store.importRoutine}
            onExport={store.exportRoutine}
            onBack={() => {
              store.reload();
              setView("list");
            }}
          />
        ) : view === "history" ? (
          <WorkoutHistory
            key="history"
            store={store}
            onBack={() => setView("list")}
            onEditSession={handleEditSession}
          />
        ) : view === "detail" && selectedDay ? (
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
              setView("detail");
            }}
            onEditRoutine={() => setView("editor")}
            onViewHistory={() => setView("history")}
            onSignOut={signOut}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
