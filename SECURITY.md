# Security Policy

We take the security of the platform and the privacy of our users seriously.
Thanks for taking the time to look into either before reporting.

## Reporting a vulnerability

If you believe you've found a security issue, **please do not open a public
GitHub issue**. Instead, contact us privately so we can investigate and
ship a fix before the details become public:

1. Email the maintainer of this repository (see the **About** section of the
   GitHub project page) with a description of the issue.
2. Include enough detail to reproduce — ideally a proof-of-concept, the
   affected endpoint or page, the expected vs. observed behaviour, and any
   relevant request/response snippets.
3. If you are publishing the report elsewhere later, please give us at least
   **90 days** to ship a fix and notify affected users before disclosure.

We commit to acknowledging your report within **3 business days** and to
keeping you posted on our progress.

## What's in scope

- Authentication and session handling on the marketing site and the
  client/admin portals.
- Database-level Row-Level Security (RLS) policies and triggers under
  `supabase/migrations/`.
- Server actions and API routes under `src/`.
- Public-facing forms (e.g. the coaching application form, login).
- Any data exposure (PII, payment receipts, progress photos) that a
  non-admin user shouldn't be able to read or modify.

## What's not in scope

- Denial-of-service attacks on shared infrastructure (Supabase, Vercel,
  Cloudflare). Report these directly to the relevant provider.
- Self-XSS or social-engineering scenarios that require the victim to
  paste attacker-controlled content into their own browser console or
  upload UI.
- Bugs in third-party dependencies that are already fixed upstream — open
  a regular PR to bump the dependency instead.
- Best-practice recommendations without a demonstrated impact (e.g.
  "you should add header X"). We'll happily take a PR.

## Disclosure & credit

Once a fix has shipped, we're happy to credit you in the release notes
or the relevant PR if you'd like. Let us know your preferred name and
link when you report.

Thanks for helping keep the platform safe.
