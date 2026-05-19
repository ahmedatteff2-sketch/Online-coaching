import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { SITE_NAME } from "@/lib/seo/site";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = readLocaleFromCookie();
  const isAr = locale === "ar";

  return (
    <div className="relative min-h-screen bg-background">
      {/* Top utility strip — the kind of tight all-caps line you'd see above
          a print magazine's nameplate. Reinforces "this isn't a SaaS demo". */}
      <div className="border-b border-border/70 bg-background">
        <div className="container flex h-7 items-center justify-between font-display text-[11px] tracking-[0.18em] text-muted-foreground">
          <span>
            {isAr
              ? "كوتشينج أونلاين · القاهرة"
              : "ONLINE COACHING · BASED IN CAIRO"}
          </span>
          <span className="hidden sm:inline">
            {isAr ? "بقبل ٨ عملاء جدد هذا الشهر" : "TAKING 8 NEW CLIENTS / MO"}
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href="/"
            className="group flex items-baseline gap-2 font-display text-2xl tracking-tight"
          >
            <span className="text-foreground">AHMED</span>
            <span className="h-1.5 w-1.5 translate-y-[-3px] bg-primary" />
            <span className="text-muted-foreground transition-colors group-hover:text-foreground">
              {isAr ? "كوتش" : "COACH"}
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <Link
              href="/#how"
              className="hidden rounded-none px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              {isAr ? "إزاي بشتغل" : "How I work"}
            </Link>
            <Link
              href="/packages"
              className="hidden rounded-none px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              {isAr ? "الباقات" : "Packages"}
            </Link>
            <Link
              href="/#faq"
              className="hidden rounded-none px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
            >
              {isAr ? "أسئلة" : "FAQ"}
            </Link>
            <LocaleSwitcher current={locale} />
            <Link
              href="/login"
              className="rounded-none px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              {isAr ? "دخول" : "Log in"}
            </Link>
            <Link
              href="/apply"
              className="ms-1 inline-flex items-center gap-2 bg-foreground px-4 py-2 font-display text-sm tracking-wider text-background transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {isAr ? "قدّم" : "APPLY"}
              <span aria-hidden>→</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-[2]">{children}</main>

      <footer className="border-t border-border bg-background">
        <div className="container py-12">
          <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr]">
            <div>
              <Link
                href="/"
                className="font-display text-4xl leading-none tracking-tight"
              >
                AHMED
                <span className="text-primary">.</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                {isAr
                  ? "كوتش أحمد. تدريب أونلاين واحد-لواحد. مبني على الجدول اللي عندك فعلاً، مش اللي نفسك فيه."
                  : "Coach Ahmed. 1-on-1 online coaching, built for the schedule you actually have — not the one you wish you had."}
              </p>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <p className="mb-2 font-display tracking-[0.18em] text-muted-foreground">
                {isAr ? "الموقع" : "SITE"}
              </p>
              <Link
                href="/packages"
                className="text-foreground hover:text-primary"
              >
                {isAr ? "الباقات" : "Packages"}
              </Link>
              <Link
                href="/apply"
                className="text-foreground hover:text-primary"
              >
                {isAr ? "قدّم" : "Apply"}
              </Link>
              <Link
                href="/login"
                className="text-foreground hover:text-primary"
              >
                {isAr ? "دخول العميل" : "Client login"}
              </Link>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <p className="mb-2 font-display tracking-[0.18em] text-muted-foreground">
                {isAr ? "قانوني" : "LEGAL"}
              </p>
              <Link
                href="/privacy"
                className="text-foreground hover:text-primary"
              >
                {isAr ? "الخصوصية" : "Privacy"}
              </Link>
              <Link
                href="/terms"
                className="text-foreground hover:text-primary"
              >
                {isAr ? "الشروط" : "Terms"}
              </Link>
              <Link
                href="/refund-policy"
                className="text-foreground hover:text-primary"
              >
                {isAr ? "سياسة الاسترداد" : "Refund policy"}
              </Link>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <p>
              © {new Date().getFullYear()} {SITE_NAME}.{" "}
              {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
            </p>
            <p className="font-display tracking-[0.18em]">
              {isAr ? "اتدرّب. اتغير." : "TRAIN. CHANGE."}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
