import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ExerciseLibraryItem } from "@/types/database";

export async function listExerciseLibrary(): Promise<ExerciseLibraryItem[]> {
  const supabase = createClient();
  const { data } = (await supabase
    .from("exercise_library")
    .select("*")
    .order("muscle_group", { ascending: true })
    .order("name", { ascending: true })) as {
    data: ExerciseLibraryItem[] | null;
  };
  return data ?? [];
}
