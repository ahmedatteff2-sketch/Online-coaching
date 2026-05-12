/**
 * Bootstrap a Supabase admin user.
 *
 * Usage:
 *   pnpm db:bootstrap-admin
 *
 * The script reads ADMIN_EMAIL / ADMIN_PASSWORD from env when present,
 * otherwise it prompts interactively (with the password hidden) so the
 * credentials never end up in your shell history or process listing.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (or in a loaded .env.local). Re-running with the same email
 * is a no-op aside from re-asserting the admin role on the profile row.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

function loadDotEnvLocal() {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf-8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadDotEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME ?? "Coach";

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
    );
  }
  // Fall back to interactive prompts when env vars are missing. This
  // keeps the password out of shell history and process listings.
  const adminEmail = email ?? (await promptLine("Admin email: "));
  if (!adminEmail) {
    throw new Error("Admin email is required.");
  }
  const adminPassword =
    password ?? (await promptLine("Admin password (input hidden): ", true));
  if (!adminPassword) {
    throw new Error("Admin password is required.");
  }
  if (adminPassword.length < 12) {
    throw new Error("Admin password must be at least 12 characters long.");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Try to create the user (idempotent — handle "already exists").
  // Note: we deliberately do NOT set role in user_metadata. The
  // handle_new_user trigger ignores any role passed there for safety
  // (see 0011_security_hardening.sql), and we re-assert the admin
  // role on the profile row below.
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  let userId: string | undefined = created?.user?.id;

  if (
    createErr &&
    !/already.*registered|already.*exists/i.test(createErr.message)
  ) {
    throw createErr;
  }

  if (!userId) {
    // Already existed — look up the id by listing.
    const { data: list, error: listErr } =
      await supabase.auth.admin.listUsers({ perPage: 200 });
    if (listErr) throw listErr;
    const found = list.users.find(
      (u) => u.email?.toLowerCase() === adminEmail.toLowerCase(),
    );
    if (!found) throw new Error("Could not locate existing admin user.");
    userId = found.id;
  }

  // 2. Force-set role + name on the profile row. This is the *only*
  // sanctioned way to grant the admin role.
  const { error: profileErr } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, email: adminEmail, role: "admin", full_name: fullName },
      { onConflict: "id" },
    );
  if (profileErr) throw profileErr;

  console.log(`Admin ready: ${adminEmail} (${userId})`);
}

/**
 * Read a line from the terminal. When `hidden` is true, suppresses echo
 * so the password isn't displayed as it's typed.
 */
function promptLine(prompt: string, hidden = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    if (hidden) {
      // Override the output writer so each chunk written by readline
      // is replaced with `*` (the password text is still received via
      // the input stream).
      type RLWithOutput = {
        output: NodeJS.WritableStream;
        _writeToOutput?: (text: string) => void;
      };
      const internal = rl as unknown as RLWithOutput;
      internal._writeToOutput = (text: string) => {
        if (text.includes(prompt)) {
          internal.output.write(text);
        } else if (text === "\n" || text === "\r\n") {
          internal.output.write(text);
        } else {
          internal.output.write("*");
        }
      };
    }
    rl.question(prompt, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
    rl.on("error", reject);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
