import "server-only";
import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./config";
import { LOCALE_COOKIE } from "./locale-cookie-name";

export function readLocaleFromCookie(): Locale {
  const value = (cookies() as unknown as UnsafeUnwrappedCookies).get(LOCALE_COOKIE)?.value;
  if (value && (SUPPORTED_LOCALES as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}
