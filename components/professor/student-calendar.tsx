"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WorkoutLog, WorkoutDay } from "@/lib/workout-data";
import type { ExtraSession } from "@/lib/professor-store";

interface StudentCalendarProps {
  logs: WorkoutLog[];
  extraSessions: ExtraSession[];
  routine: WorkoutDay[];
  onSelectDay: (date: string) => void;
}

const DAY_NAMES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

export function StudentCalendar({
  logs,
  extraSessions,
  routine,
  onSelectDay,
}: StudentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const logsByDate = useMemo(() => {
    const map: Record<string, WorkoutLog[]> = {};
    for (const log of logs) {
      if (!map[log.date]) map[log.date] = [];
      map[log.date].push(log);
    }
    return map;
  }, [logs]);

  const extraByDate = useMemo(() => {
    const map: Record<string, ExtraSession[]> = {};
    for (const s of extraSessions) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, [extraSessions]);

  const getDayName = (dayId: string): string => {
    const day = routine.find((d) => d.id === dayId);
    return day?.name || dayId;
  };

  const daysInMonth = new Date(
    currentMonth.year,
    currentMonth.month + 1,
    0
  ).getDate();

  const firstDayOfWeek = (() => {
    const d = new Date(currentMonth.year, currentMonth.month, 1).getDay();
    return d === 0 ? 6 : d - 1; // Monday = 0
  })();

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0)
        return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11)
        return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const monthLabel = new Date(
    currentMonth.year,
    currentMonth.month
  ).toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const completedLogs = useMemo(() => {
    return logs.filter(
      (l) =>
        l.completed &&
        new Date(l.date + "T12:00:00").getMonth() === currentMonth.month &&
        new Date(l.date + "T12:00:00").getFullYear() === currentMonth.year
    );
  }, [logs, currentMonth]);

  const totalWorkoutDays = new Set(completedLogs.map((l) => l.date)).size;

  return (
    <div>
      {/* Month nav */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-bold capitalize text-foreground">
          {monthLabel}
        </h3>
        <button
          onClick={nextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground active:scale-95"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Compliance */}
      <div className="mb-4 rounded-xl bg-primary/10 p-3 text-center">
        <span className="text-xs font-medium text-primary">
          {totalWorkoutDays} dias de entrenamiento este mes
        </span>
      </div>

      {/* Day names header */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[10px] font-bold uppercase text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for first week offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[70px]" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${currentMonth.year}-${String(
            currentMonth.month + 1
          ).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const dayLogs = logsByDate[dateStr]?.filter((l) => l.completed) || [];
          const dayExtras = extraByDate[dateStr] || [];
          const hasActivity = dayLogs.length > 0 || dayExtras.length > 0;

          return (
            <motion.button
              key={dayNum}
              onClick={() => hasActivity && onSelectDay(dateStr)}
              disabled={!hasActivity}
              className={`min-h-[70px] rounded-lg p-1 text-left transition-all ${
                hasActivity
                  ? "bg-card border border-border hover:border-primary/50 active:scale-95 cursor-pointer"
                  : "opacity-40 cursor-default"
              }`}
            >
              <span
                className={`block text-[10px] font-bold ${
                  hasActivity ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {dayNum}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayLogs.map((log) => (
                  <div
                    key={log.day_id}
                    className="truncate rounded bg-green-500/20 px-1 py-0.5 text-[8px] font-medium text-green-400"
                  >
                    {getDayName(log.day_id)}
                  </div>
                ))}
                {dayExtras.map((s) => (
                  <div
                    key={s.id}
                    className="truncate rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-medium text-blue-400"
                  >
                    {s.activity_type}
                  </div>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
