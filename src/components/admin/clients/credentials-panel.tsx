"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";

interface Props {
  locale: Locale;
  email: string;
  password: string;
  loginUrl: string;
  /** Optional CTA — e.g. "go to client profile" after first creation. */
  continueHref?: string;
  continueLabel?: string;
  /** Optional secondary action (e.g. a "Done" / "Close" button). */
  onClose?: () => void;
}

/**
 * Shows a freshly issued client login (email + temporary password) with
 * one-click copy buttons and a pre-built share message. Designed for the
 * admin to copy and send to the client over WhatsApp / email.
 */
export function CredentialsPanel({
  locale,
  email,
  password,
  loginUrl,
  continueHref,
  continueLabel,
  onClose,
}: Props) {
  const message =
    locale === "ar"
      ? `بيانات دخولك على المنصة:\nالرابط: ${loginUrl}\nالإيميل: ${email}\nكلمة السر المؤقتة: ${password}\n(غيّرها بعد أول دخول.)`
      : `Your coaching app login:\nLink: ${loginUrl}\nEmail: ${email}\nTemporary password: ${password}\n(Change it after your first login.)`;

  return (
    <div className="space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-semibold text-primary">
          {locale === "ar" ? "تم إنشاء الحساب" : "Account ready"}
        </p>
        <p className="text-xs text-muted-foreground">
          {locale === "ar"
            ? "ابعت بيانات الدخول للعميل دلوقتي — كلمة السر المؤقتة دي مش هتظهر تاني."
            : "Send these credentials to the client now — the temporary password won't be shown again."}
        </p>
      </div>

      <div className="space-y-2">
        <CopyRow
          locale={locale}
          label={locale === "ar" ? "الإيميل" : "Email"}
          value={email}
        />
        <CopyRow
          locale={locale}
          label={locale === "ar" ? "كلمة السر المؤقتة" : "Temporary password"}
          value={password}
          monospace
        />
        <CopyRow
          locale={locale}
          label={locale === "ar" ? "رسالة جاهزة" : "Ready-to-send message"}
          value={message}
          textarea
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={loginUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          {locale === "ar" ? "افتح صفحة الدخول" : "Open the login page"}
        </a>
        {continueHref ? (
          <Link
            href={continueHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "ms-auto",
            )}
          >
            {continueLabel ??
              (locale === "ar" ? "افتح ملف العميل" : "Open client profile")}
          </Link>
        ) : null}
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose}>
            {locale === "ar" ? "تمام" : "Done"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function CopyRow({
  locale,
  label,
  value,
  monospace,
  textarea,
}: {
  locale: Locale;
  label: string;
  value: string;
  monospace?: boolean;
  textarea?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable — fall back to selection.
    }
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied
            ? locale === "ar"
              ? "اتنسخ"
              : "Copied"
            : locale === "ar"
              ? "نسخ"
              : "Copy"}
        </button>
      </div>
      {textarea ? (
        <textarea
          readOnly
          value={value}
          rows={4}
          className="block w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed"
        />
      ) : (
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className={
            "block w-full rounded-md border border-border bg-background px-3 py-2 text-sm" +
            (monospace ? " font-mono" : "")
          }
        />
      )}
    </div>
  );
}
