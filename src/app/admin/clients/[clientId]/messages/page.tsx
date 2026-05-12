import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClientDetail } from "@/lib/clients/queries";
import { getThreadMessages } from "@/lib/messages/queries";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { MessageThread } from "@/components/messages/message-thread";

export const dynamic = "force-dynamic";

export default async function AdminClientMessagesPage(
  props: {
    params: Promise<{ clientId: string }>;
  }
) {
  const params = await props.params;
  const detail = await getClientDetail(params.clientId);
  if (!detail) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = readLocaleFromCookie();
  const messages = await getThreadMessages(params.clientId);
  const otherName = detail.profile.full_name ?? detail.profile.email;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/messages"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {locale === "ar" ? "كل المحادثات" : "All conversations"}
      </Link>

      <div>
        <p className="text-sm text-muted-foreground">{detail.profile.email}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {otherName}
        </h1>
      </div>

      <MessageThread
        clientId={params.clientId}
        currentUserId={user.id}
        initialMessages={messages}
        locale={locale}
        otherPartyName={otherName}
      />
    </div>
  );
}
