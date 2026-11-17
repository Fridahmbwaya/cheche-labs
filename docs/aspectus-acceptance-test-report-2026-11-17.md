# Aspectus Learning Hub — Acceptance Test Report

**Date:** 17 November 2026  
**Environment:** Aspectus preview on `feature/aspectus-learning-hub`; connected Supabase project `lzumqcyhsiegkmzwmlsl`  
**Test type:** Live database permission and integration checks in rollback-only transactions; deployed-route HTTP smoke tests; source-level behavior inspection.  
**Overall result:** **Core database journey PASS; signed-in browser acceptance NOT YET COMPLETE.**

> **Strict data safeguard:** No tests mutated Ian's (`aspectusmarketing@gmail.com`) or Brenda's (`aspectuscontent@gmail.com`) live records, submissions, quizzes, reviews or reviewer account. Test writes used Sarah's profile *temporarily* as an employee, Fridah as administrator and the designated test-manager profile, **all within transactions ending in ROLLBACK**. There were no committed test submissions, invitations or reviewer links.

## A. End-to-end data handoff — PASS

A rollback-only transaction tested the following:

| Step | Result | Evidence / assertion |
|---|---|---|
| Super Admin assigns a published module | PASS | Learner sees only assigned modules; unrelated reviewer assignment remains |
| Learner lesson state persists | PASS | `aspectus_lesson_progress` saved and readable |
| Learner cannot submit assignment without passing quiz | PASS | Row-level security rejects pre-quiz submission |
| Learner submits valid quiz | PASS | `aspectus_submit_quiz` returns a pass and creates the attempt |
| Learner submits project | PASS | `learning_submissions` becomes visible to assigned reviewer |
| Reviewer starts and edits private draft | PASS | `aspectus_review_drafts` saves and updates |
| Learner cannot read unpublished review draft | PASS | Reviewer draft RLS hides it |
| Reviewer requests revision | PASS | Review decision, feedback and submission status updated; private draft cleared |
| Learner sees requested changes | PASS | Learner can read finalized review |
| Learner resubmits work | PASS | New submission visible to reviewer; prior review history preserved |
| Reviewer approves revision | PASS | Second review persisted; learner sees approved outcome |
| Super Admin can inspect test history | PASS | Admin view can read both submissions and decisions |

**Important:** This proves the **database API and RLS path**; it does not prove every clickable control successfully invokes these operations in a signed-in browser.

## B. Permission-isolation tests — PASS

- Removing a test reviewer's permission **hid** test-learner progress from that reviewer; the underlying progress row remained intact.
- A Super Admin could create a **pending** reviewer invitation with preassigned learning modules and learner-review coverage.
- A non-admin reviewer was rejected when attempting account invitations.
- After a module assignment was revoked, the learner could **not** create a new assignment even though a prior passed quiz still existed.
- A private review draft was not readable by the learner.
- All test mutations rolled back; no irreversible reset or write was applied to a live learner.

## C. Authorization defect found and corrected — PASS after remediation

**Finding:** The original `aspectus_submit_quiz` function allowed an authenticated person within the organization to record a quiz result for a **module not assigned to them**. The original lesson-progress and submission insert checks also did not require an active assignment.

**Correction:** Added assignment and published-module authorization to the quiz RPC and restrictive insert/update RLS policies for lesson progress and submission creation. Existing records were not edited.

**Verified after migration:** An unassigned test learner's quiz and lesson saves were **rejected**; after a legitimate assignment, the same learner's lesson, quiz and project submission **succeeded**. A later revocation prevented new project submission while preserving the prior quiz result.

**Database migration:** `supabase/migrations/20261117154604_aspectus_enforce_published_module_assignments.sql`

## D. Test-learner reset — FUNCTION PASSES, CONFIGURATION NEEDS CORRECTION

- The existing dedicated test identity (`fridahmunji@gmail.com`) currently has database role **`org_admin`**.
- The reset RPC deliberately requires that same identity to have role **`employee`**.
- As configured today, attempting the reset returns **permission denied**.
- In a **rollback-only** transaction, after temporarily setting that identity to `employee`, the reset procedure succeeded; rollback restored all prior quiz and lesson records and the original Super Admin role.
- **Recommendation:** Create a separate QA learner sign-in with its own accessible inbox instead of demoting the existing Super Admin identity. Keep test-manager and test-learner roles distinct.

## E. Deployed-route checks — HTTP 200

The current preview responded successfully for:

- `/preview/aspectus-welcome.html`
- `/aspectus`
- `/aspectus/profile`
- `/aspectus/learning-profile`
- `/aspectus/admin/architecture`
- `/aspectus/admin/health`
- `/aspectus/preview`

A 200 response means the route is served. Because these Next.js pages check authentication in the browser, **it does not validate role-specific signed-in rendering**.

## F. Outstanding acceptance tests

| Check | Status | Why it is not signed off |
|---|---|---|
| Magic-link email actually arrives and opens | NOT RUN | No accessible QA mailbox/login link in this test session |
| New invited account claims its role on callback | PARTIAL | Pending invite data checked; actual sign-in callback not executed |
| Learner clicks baseline → lesson → quiz → assignment in browser | PARTIAL | Database behavior passed; no authenticated browser session |
| File upload/download/attachment preview | NOT RUN | Requires authenticated browser and test file |
| Reviewer types, navigates away, reloads, recovers autosaved draft | PARTIAL | Database saving passed; browser local backup UI not click-tested |
| Reviewer clicks request changes and learner clicks resubmit | PARTIAL | Database flow passed; buttons not click-tested while signed in |
| Super Admin module preview isolation from real learners | SOURCE-REVIEWED | Preview disables real progress writes; no signed-in cross-account browser comparison |
| Profile photo selection, upload, replacement, removal | PARTIAL | Storage/permission code and route exist; no signed-in browser interaction |
| Screen-reader / mobile / keyboard flows | NOT RUN | Needs rendered UI acceptance pass |
| Current test-learner reset control | BLOCKED | Test account role does not match test-reset permission |
| Exact “completion” wording | ISSUE FOUND | One UI message says “approved” even though metric counts quiz passed + submitted project |
| Lesson “Save & exit” confirmation | ISSUE FOUND | Save is asynchronous; closing is not currently gated on a verified server receipt |

## G. Preservation check

A post-test database query confirmed:

- **Ian:** active employee, 8 module assignments, 9 quiz attempts, 8 saved lesson records, 7 submitted assignment records, 0 submitted formal reviews in the checked snapshot.
- **Brenda:** active manager, 8 own module assignments, 0 formal reviews submitted in the checked snapshot; reviewer access to Ian remains configured.
- **Fridah:** `org_admin` role unchanged; original 12 quiz attempts retained.
- **Sarah:** `org_admin` role unchanged; no QA submissions remain.
- Temporary QA invites, QA submissions and temporary reviewer-to-Sarah links: **0** after rollback.

These counts are a point-in-time check and can naturally change when real users work.

## H. Release / QA recommendation

Do **not** mark “all four account journeys accepted in-browser” yet. Mark **database integration PASSED** and **browser acceptance PENDING**. The next safe validation should use:

1. A dedicated QA learner with an accessible email inbox, eight test module assignments and no real Ian history.
2. A separate QA reviewer linked only to the QA learner.
3. An existing Super Admin to inspect permissions and health *without changing Ian's or Brenda's records*.
4. One test journey covering invite → login → lesson step → quiz → file assignment → reviewer autosave → request changes → resubmit → approval → learner feedback → admin health → profile photo.
5. Independent QA reset restricted to the QA learner only.

**No other courses need to be expanded until these outstanding browser tests are completed.**
