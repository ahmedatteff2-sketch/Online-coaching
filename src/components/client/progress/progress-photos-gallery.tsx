"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { addProgressPhoto, deleteProgressPhoto } from "@/lib/tracking/actions";
import type { ProgressPhoto } from "@/types/database";
import type { Locale } from "@/lib/i18n/config";

interface PhotoWithUrl extends ProgressPhoto {
  url: string | null;
}

interface Props {
  locale: Locale;
  clientId: string;
  photos: PhotoWithUrl[];
}

// Client-side guardrails. Storage RLS still enforces ownership server-side;
// these are about UX (don't try to upload a 50MB video, give a clear error
// if the user picks a non-image).
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const ALLOWED_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

function randomSuffix(bytes: number): string {
  const buf = new Uint8Array(bytes);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i += 1) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function inferExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ALLOWED_IMAGE_EXTS.includes(fromName)) return fromName;
  // Fallback: derive from MIME type when the file name has no extension.
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  if (file.type === "image/heif") return "heif";
  return "jpg";
}

export function ProgressPhotosGallery({ locale, clientId, photos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [compare, setCompare] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  function toggleCompare(id: string) {
    setCompare(([a, b]) => {
      if (a === id) return [null, b];
      if (b === id) return [a, null];
      if (!a) return [id, b];
      if (!b) return [a, id];
      return [b, id];
    });
  }

  async function handleUpload(file: File, takenOn: string, note: string) {
    setError(null);
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setError(
        locale === "ar"
          ? "الصورة أكبر من 8 ميجابايت. اختار صورة أصغر."
          : "Photo is larger than 8 MB. Pick a smaller one.",
      );
      return;
    }
    if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError(
        locale === "ar"
          ? "صيغة الملف مش مدعومة. استخدم JPG أو PNG أو WEBP."
          : "Unsupported file type. Use JPG, PNG, or WEBP.",
      );
      return;
    }
    setUploading(true);
    try {
      const supabase = createBrowserSupabase();
      const ext = inferExtension(file);
      // Use Web Crypto for the random suffix so the upload path is not
      // predictable. The server enforces a strict path regex
      // (`<uuid>/<filename>`) and rejects anything malformed; using
      // Math.random here would still work but is needlessly weak.
      const path = `${clientId}/${Date.now()}-${randomSuffix(6)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("progress-photos")
        .upload(path, file, { upsert: false });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const result = await addProgressPhoto({
        storage_path: path,
        taken_on: takenOn,
        note,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not record photo.");
        return;
      }
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  const [first, second] = compare;
  const a = photos.find((p) => p.id === first);
  const b = photos.find((p) => p.id === second);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {locale === "ar" ? "صور التقدم" : "Progress photos"}
        </CardTitle>
        <CardDescription>
          {locale === "ar"
            ? "ارفع صورك. الصور خاصة بيك وبس وبتظهر للكوتش."
            : "Upload privately. Only you and your coach can see them."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const file = fd.get("photo") as File;
            if (!file || file.size === 0) {
              setError(locale === "ar" ? "اختار صورة." : "Pick a photo.");
              return;
            }
            const takenOn =
              String(fd.get("taken_on") ?? "") ||
              new Date().toISOString().slice(0, 10);
            const note = String(fd.get("note") ?? "");
            void handleUpload(file, takenOn, note).then(() =>
              (e.target as HTMLFormElement).reset(),
            );
          }}
          className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"
        >
          <div className="space-y-1">
            <Label htmlFor="photo">
              {locale === "ar" ? "الصورة" : "Photo"}
            </Label>
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="taken_on">
              {locale === "ar" ? "التاريخ" : "Date"}
            </Label>
            <Input
              id="taken_on"
              name="taken_on"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="self-end">
            <Button type="submit" disabled={uploading}>
              <Upload className="h-4 w-4" />
              {uploading
                ? locale === "ar"
                  ? "جاري الرفع…"
                  : "Uploading…"
                : locale === "ar"
                  ? "رفع"
                  : "Upload"}
            </Button>
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="note">
              {locale === "ar" ? "ملاحظة (اختياري)" : "Note (optional)"}
            </Label>
            <Input id="note" name="note" maxLength={200} />
          </div>
        </form>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {a && b ? (
          <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-card/60 p-3">
            <CompareTile photo={a} locale={locale} />
            <CompareTile photo={b} locale={locale} />
          </div>
        ) : null}

        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {locale === "ar" ? "مفيش صور لسه." : "No photos yet."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => {
              const selected = compare[0] === p.id || compare[1] === p.id;
              return (
                <div
                  key={p.id}
                  className={`group relative overflow-hidden rounded-md border ${
                    selected ? "border-primary" : "border-border/60"
                  }`}
                >
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={p.note ?? p.taken_on}
                      className="h-40 w-full cursor-pointer object-cover"
                      onClick={() => toggleCompare(p.id)}
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-card text-xs text-muted-foreground">
                      —
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-card/90 px-2 py-1 text-xs">
                    <span>{p.taken_on}</span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        const ok = window.confirm(
                          locale === "ar"
                            ? "حذف الصورة؟"
                            : "Delete this photo?",
                        );
                        if (!ok) return;
                        startTransition(async () => {
                          await deleteProgressPhoto(p.id, p.storage_path);
                          router.refresh();
                        });
                      }}
                      className="text-destructive hover:opacity-80"
                      aria-label={locale === "ar" ? "حذف" : "Delete"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {photos.length >= 2 ? (
          <p className="text-xs text-muted-foreground">
            {locale === "ar"
              ? "اضغط على صورتين عشان تقارنهم جنب بعض."
              : "Click two photos to compare them side by side."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CompareTile({
  photo,
  locale,
}: {
  photo: PhotoWithUrl;
  locale: Locale;
}) {
  return (
    <div className="space-y-1 text-xs">
      {photo.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt={photo.note ?? photo.taken_on}
          className="h-72 w-full rounded-md object-cover"
        />
      ) : null}
      <p className="font-medium">
        {photo.taken_on}{" "}
        <span className="text-muted-foreground">
          ({locale === "ar" ? "ضغط للإلغاء" : "click to deselect"})
        </span>
      </p>
      {photo.note ? (
        <p className="text-muted-foreground">{photo.note}</p>
      ) : null}
    </div>
  );
}
