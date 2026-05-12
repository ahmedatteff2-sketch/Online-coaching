import type { Locale } from "@/lib/i18n/config";

/**
 * WhatsApp message templates.
 *
 * Each helper returns a plain string. Use `buildWhatsappLink` to turn a
 * template + a phone number into a `https://wa.me/...?text=...` link.
 *
 * The coach's Vodafone Cash number and display name come from env vars
 * so they're configurable per deploy without touching code:
 *   - NEXT_PUBLIC_COACH_VODAFONE_NUMBER (required for payment templates)
 *   - NEXT_PUBLIC_COACH_NAME (optional, falls back to "the coach")
 */

function coachDisplayName(locale: Locale): string {
  return (
    process.env.NEXT_PUBLIC_COACH_NAME ||
    (locale === "ar" ? "الكوتش" : "the coach")
  );
}

function vodafoneNumber(): string {
  return process.env.NEXT_PUBLIC_COACH_VODAFONE_NUMBER ?? "";
}

export interface PaymentInstructionsInput {
  clientName: string;
  amount: number | string;
  currency?: string;
  packageName?: string | null;
  locale: Locale;
}

export function paymentInstructionsMessage(
  input: PaymentInstructionsInput,
): string {
  const currency = input.currency ?? "EGP";
  const vodafone = vodafoneNumber();
  const coach = coachDisplayName(input.locale);

  if (input.locale === "ar") {
    const lines = [
      `أهلاً ${input.clientName} 👋`,
      ``,
      input.packageName
        ? `اتفقنا على باقة: ${input.packageName}`
        : `اتفقنا على الاشتراك.`,
      `المبلغ المستحق: ${input.amount} ${currency}`,
      ``,
      `طريقة الدفع: فودافون كاش`,
      vodafone ? `الرقم: ${vodafone}` : `الرقم: (هيتبعتلك في رسالة تانية)`,
      ``,
      `بعد التحويل، من فضلك ابعتلي:`,
      `1) صورة من رسالة تأكيد الدفع`,
      `2) الرقم اللي حولت منه`,
      ``,
      `أول ما أستلم الإيصال، هفعّلك حسابك على المنصة على طول.`,
      `شكراً — ${coach}`,
    ];
    return lines.join("\n");
  }

  const lines = [
    `Hi ${input.clientName} 👋`,
    ``,
    input.packageName
      ? `For your ${input.packageName} package`
      : `For your coaching subscription`,
    `Amount due: ${input.amount} ${currency}`,
    ``,
    `Payment method: Vodafone Cash`,
    vodafone ? `Number: ${vodafone}` : `Number: (I'll share it in a follow-up message)`,
    ``,
    `Once you've sent the money, please reply with:`,
    `1) A screenshot of the confirmation SMS`,
    `2) The phone number you sent it from`,
    ``,
    `As soon as I receive the receipt, I'll activate your account on the platform.`,
    `Thanks — ${coach}`,
  ];
  return lines.join("\n");
}

export interface WelcomeMessageInput {
  clientName: string;
  loginUrl: string;
  email: string;
  /**
   * Optional temporary password. Including this field in a WhatsApp
   * message means the password lives in the conversation forever and
   * in WhatsApp's web/desktop backups, so callers should prefer
   * omitting it and using an out-of-band channel (in-person, a
   * password manager share, or a one-time reset link the user can
   * trigger themselves).
   *
   * @deprecated Send the password separately, or use an invite link.
   */
  tempPassword?: string;
  locale: Locale;
}

export function welcomeMessage(input: WelcomeMessageInput): string {
  const coach = coachDisplayName(input.locale);
  if (input.locale === "ar") {
    const lines = [
      `تمام ${input.clientName}، استلمت الدفعة ✅`,
      ``,
      `حسابك على المنصة اتفعّل. بيانات دخولك:`,
      `الرابط: ${input.loginUrl}`,
      `الإيميل: ${input.email}`,
    ];
    if (input.tempPassword) {
      lines.push(`كلمة السر المؤقتة: ${input.tempPassword}`);
    } else {
      lines.push(
        `كلمة السر: هابعتهالك في رسالة منفصلة عشان تفضل آمنة.`,
      );
    }
    lines.push(
      ``,
      `(غيّر كلمة السر بعد أول دخول.)`,
      `في أول دخول هتلاقي الخطة ومقاييسك. يلا نبدأ 💪`,
      ``,
      `— ${coach}`,
    );
    return lines.join("\n");
  }
  const lines = [
    `${input.clientName}, payment received ✅`,
    ``,
    `Your account is live. Login details:`,
    `URL: ${input.loginUrl}`,
    `Email: ${input.email}`,
  ];
  if (input.tempPassword) {
    lines.push(`Temporary password: ${input.tempPassword}`);
  } else {
    lines.push(
      `Password: I'll send it to you in a separate message so it stays secure.`,
    );
  }
  lines.push(
    ``,
    `(Change your password after your first login.)`,
    `Log in to see your plan and baseline measurements. Let's go 💪`,
    ``,
    `— ${coach}`,
  );
  return lines.join("\n");
}

export function renewalReminderMessage(input: {
  clientName: string;
  daysRemaining: number;
  endsOn: string;
  locale: Locale;
}): string {
  if (input.locale === "ar") {
    return [
      `أهلاً ${input.clientName}،`,
      ``,
      `اشتراكك بيخلص يوم ${input.endsOn} (بعد ${input.daysRemaining} يوم).`,
      `لو حابب تكمّل، ابعت الدفعة دلوقتي عشان الحساب ميتوقفش.`,
    ].join("\n");
  }
  return [
    `Hi ${input.clientName},`,
    ``,
    `Your subscription ends on ${input.endsOn} (${input.daysRemaining} days).`,
    `Send your renewal payment now to keep your access running.`,
  ].join("\n");
}

/**
 * Normalise a phone number to digits-only so it's safe to embed in a
 * wa.me URL. Handles inputs like "+20 100 123-4567".
 */
export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D+/g, "");
}

export function buildWhatsappLink(phone: string, message: string): string {
  const digits = normalizePhone(phone);
  const encoded = encodeURIComponent(message);
  if (!digits) return `https://wa.me/?text=${encoded}`;
  return `https://wa.me/${digits}?text=${encoded}`;
}
