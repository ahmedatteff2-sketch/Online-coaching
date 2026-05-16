import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";
import { computeSubscriptionSnapshot } from "@/lib/subscription/status";
import type { SubscriptionStatus, UserRole } from "@/types/database";

type ProfileRoleRow = { role: UserRole } | null;
type ClientSubscriptionRow = {
  subscription_status: SubscriptionStatus;
  subscription_ends_at: string | null;
} | null;

const ADMIN_PREFIX = "/admin";
const CLIENT_PREFIX = "/client";
/** Paths a suspended/expired client is allowed to reach inside /client. */
const CLIENT_ALLOWLIST_WHEN_SUSPENDED = ["/client/subscription"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith(CLIENT_PREFIX);

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isProtected) {
    const { data: profile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()) as { data: ProfileRoleRow };
    const role = profile?.role;

    if (pathname.startsWith(ADMIN_PREFIX) && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = role === "client" ? "/client/dashboard" : "/login";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith(CLIENT_PREFIX) && role !== "client") {
      const url = request.nextUrl.clone();
      url.pathname = role === "admin" ? "/admin/dashboard" : "/login";
      return NextResponse.redirect(url);
    }

    // Subscription gate — clients whose subscription is expired or
    // admin-suspended can only see their subscription page. The nightly
    // cron (or RPC on payment confirm) keeps subscription_status fresh;
    // as a belt-and-braces check we also recompute from the end date
    // client-side so a freshly-expired row redirects immediately even
    // before the cron runs.
    if (
      pathname.startsWith(CLIENT_PREFIX) &&
      role === "client" &&
      !CLIENT_ALLOWLIST_WHEN_SUSPENDED.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      )
    ) {
      const { data: clientRow } = (await supabase
        .from("clients")
        .select("subscription_status, subscription_ends_at")
        .eq("user_id", user.id)
        .maybeSingle()) as { data: ClientSubscriptionRow };

      if (clientRow) {
        const snap = computeSubscriptionSnapshot({
          status: clientRow.subscription_status,
          subscription_ends_at: clientRow.subscription_ends_at,
        });
        if (snap.status === "expired" || snap.status === "suspended") {
          const url = request.nextUrl.clone();
          url.pathname = "/client/subscription";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const { data: profile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()) as { data: ProfileRoleRow };
    const url = request.nextUrl.clone();
    url.pathname =
      profile?.role === "admin" ? "/admin/dashboard" : "/client/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
