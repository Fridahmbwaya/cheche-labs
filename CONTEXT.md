# Cheche Labs — Build Context

## What we're building
An AI-powered compliance training platform for Kenyan regulated industries. v0.1 MVP only.

## v0.1 scope — nothing else
Login → Employee Dashboard → One Lesson Unit → Quiz → Completion stored in DB

## Demo users (already in Supabase)
- Grace Achieng Odhiambo — grace@jua-mfb.co.ke / Demo1234! — employee, Compliance Officer
- Amina Wanjiku Hassan — amina@jua-mfb.co.ke / Demo1234! — hr_manager

## Demo org
Jua Microfinance Bank — AML/CFT module already seeded with Unit 1 and a quiz question

## Supabase
Project URL: https://dxhouoncfzrwpfqanjya.supabase.co
Keys are in .env.local
Schema is live: organisations, users, modules, units, quiz_questions, module_assignments, unit_progress, module_completions, audit_log
RLS is enabled on all tables

Key UUIDs:
- Org: a1000000-0000-0000-0000-000000000001
- Module: b1000000-0000-0000-0000-000000000001
- Unit: c1000000-0000-0000-0000-000000000001
- Grace user ID: f8a398b6-9e5f-4313-b4c7-b172d0a8e8c4

## Design system
Aligned with chechelabs.org brand tokens:
- primary (purple): hsl(248 100% 34%)
- accent (orange): hsl(26 100% 57%)
- bg: hsl(240 100% 99%)
- ink: hsl(248 75% 4%)
- muted / lavender: hsl(240 100% 95%)
- mutedFg: hsl(248 18% 42%)
- border: hsl(249 45% 93%)
- sidebar: hsl(248 65% 11%)
- sidebarFg: hsl(250 30% 72%)
- sidebarAcc: hsl(250 45% 18%)
- success / teal: hsl(160 100% 39%)
- warning: hsl(47 100% 56%)
- Logo: `/public/cheche-logo.png` (from chechelabs.org) or wordmark `cheche.` purple + orange dot
- Fonts: Space Grotesk (headings), DM Sans (body)
- Cards: white bg, 1px border, border-radius 0.75rem
- Mobile-first always

## Stack
Next.js 14, TypeScript, Tailwind, Supabase (@supabase/ssr), React Query (@tanstack/react-query)

## Rules
- Never use localStorage or sessionStorage
- Supabase service role key only in API routes
- Mobile-first Tailwind classes always
- All DB writes go through API routes
- Audit every completion event
