import { listExerciseLibrary } from "@/lib/exercise-library/queries";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { ExerciseLibraryEditor } from "@/components/admin/exercise-library/exercise-library-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminExerciseLibraryPage() {
  const locale = readLocaleFromCookie();
  const items = await listExerciseLibrary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {locale === "ar" ? "مكتبة التمارين" : "Exercise library"}
        </h1>
        <p className="text-muted-foreground">
          {locale === "ar"
            ? "كل التمارين الجاهزة اللي بتظهر في زرار «إضافة من المكتبة» في خطة كل عميل."
            : "Reusable exercises that appear under the day builder's “Add from library” button — edit defaults, drop GIFs, and avoid retyping the same lifts for every client."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar"
              ? `إجمالي التمارين (${items.length})`
              : `Exercises (${items.length})`}
          </CardTitle>
          <CardDescription>
            {locale === "ar"
              ? "الإعدادات الافتراضية بتتنسخ على التمرين لما تختاره. تقدر تعدلها بعدها على مستوى العميل."
              : "Defaults are copied onto the per-client exercise on selection — you can still tweak each one per-client afterwards."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExerciseLibraryEditor locale={locale} items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
