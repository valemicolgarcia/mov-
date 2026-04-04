"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileUp,
  FileDown,
  GripVertical,
} from "lucide-react";
import type { WorkoutDay } from "@/lib/workout-data";
import { DayEditor } from "./day-editor";
import { ImportExport } from "./import-export";

interface RoutineEditorProps {
  routine: WorkoutDay[];
  onSave: (routine: WorkoutDay[]) => Promise<void>;
  onImport: (json: string) => Promise<boolean>;
  onExport: () => string;
  onBack: () => void;
}

const COLORS = [
  "from-primary/20 to-primary/5",
  "from-blue-500/20 to-blue-500/5",
  "from-orange-500/20 to-orange-500/5",
  "from-green-500/20 to-green-500/5",
  "from-pink-500/20 to-pink-500/5",
  "from-yellow-500/20 to-yellow-500/5",
];

const EMOJIS = ["🦵", "💪", "🔥", "🏋️", "⚡", "🎯", "💥", "🚀"];

export function RoutineEditor({
  routine,
  onSave,
  onImport,
  onExport,
  onBack,
}: RoutineEditorProps) {
  const [days, setDays] = useState<WorkoutDay[]>(routine);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [saving, setSaving] = useState(false);

  const editingDay = editingDayId
    ? days.find((d) => d.id === editingDayId)
    : null;

  const handleAddDay = () => {
    const newDay: WorkoutDay = {
      id: `day-${Date.now()}`,
      name: "NUEVO DÍA",
      subtitle: "Personalizar",
      emoji: EMOJIS[days.length % EMOJIS.length],
      color: COLORS[days.length % COLORS.length],
      estimatedTime: 60,
      blocks: [],
    };
    setDays([...days, newDay]);
  };

  const handleDeleteDay = (dayId: string) => {
    setDays(days.filter((d) => d.id !== dayId));
  };

  const handleMoveDay = (index: number, direction: "up" | "down") => {
    const newDays = [...days];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newDays.length) return;
    [newDays[index], newDays[targetIndex]] = [
      newDays[targetIndex],
      newDays[index],
    ];
    setDays(newDays);
  };

  const handleUpdateDay = (updatedDay: WorkoutDay) => {
    setDays(days.map((d) => (d.id === updatedDay.id ? updatedDay : d)));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(days);
    setSaving(false);
    onBack();
  };

  const handleImport = async (json: string) => {
    const success = await onImport(json);
    if (success) {
      try {
        setDays(JSON.parse(json));
      } catch { /* ignore */ }
    }
    return success;
  };

  if (editingDay) {
    return (
      <DayEditor
        day={editingDay}
        onSave={(updated) => {
          handleUpdateDay(updated);
          setEditingDayId(null);
        }}
        onBack={() => setEditingDayId(null)}
      />
    );
  }

  if (showImportExport) {
    return (
      <ImportExport
        onImport={handleImport}
        onExport={onExport}
        onBack={() => setShowImportExport(false)}
      />
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
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-secondary/80 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black uppercase tracking-tight text-foreground">
                Editar Rutina
              </h1>
              <p className="text-xs text-muted-foreground">
                {days.length} días configurados
              </p>
            </div>
            <button
              onClick={() => setShowImportExport(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            >
              <FileUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Days list */}
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="space-y-3">
          <AnimatePresence>
            {days.map((day, index) => (
              <motion.div
                key={day.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveDay(index, "up")}
                      disabled={index === 0}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-20"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveDay(index, "down")}
                      disabled={index === days.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-20"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">
                    {day.emoji}
                  </div>

                  <button
                    onClick={() => setEditingDayId(day.id)}
                    className="flex-1 text-left"
                  >
                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Día {index + 1}
                    </span>
                    <h3 className="text-base font-bold tracking-tight text-foreground">
                      {day.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {day.blocks.length} bloques · {day.estimatedTime} min
                    </p>
                  </button>

                  <button
                    onClick={() => handleDeleteDay(day.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add day button */}
          <button
            onClick={handleAddDay}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-6 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-5 w-5" />
            Agregar Día
          </button>
        </div>

        {/* Save button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSave}
          disabled={saving}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar Rutina"}
        </motion.button>
      </div>

      <div className="h-20" />
    </motion.div>
  );
}
