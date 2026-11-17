# Aspectus Learning Hub — End-to-end product architecture (pilot v0.1)

**Status:** Audited against source files on branch \`feature/aspectus-learning-hub\`, 17 November 2026.  
**Purpose:** Make every user journey, navigation action, authorization gate, saved record and return path clear before expanding the product.  
**Scope:** Real onboarding (Ian), reviewers (Brenda), Super Admins (Sarah/Fridah), the separate test learner, Professional Skills drafts, the Leadership & Management pilot, profile photos, and the emerging learning profile.  
**Interpretation:** “Exists in code” and “builds successfully” do **not** imply a full signed-in browser clickthrough has passed.

## 1. Core product model

An account represents **a person**, not a class of account that one person can impersonate. A person can be assigned learning modules independently of their organizational role, so a reviewer or Super Admin may also be a learner. A Super Admin preview runs separately and never writes to another person's history.

Two independently managed permissions are essential:

1. **Learning assignment:** \`aspectus_module_assignments\` specifies which published modules someone can study. A reviewer assignment is **not** implied.
2. **Reviewer coverage:** \`aspectus_reviewer_assignments\` specifies which learners a reviewer can inspect and assess. A module assignment is **not** implied.

Visible labels:

| Database role | Experience | Can edit real learner work? |
|---|---|---|
| \`employee\` | Learner (Ian and future staff) | Own quizzes and assignments; never someone else's |
| \`manager\` / \`hr_manager\` | Reviewer (Brenda) + any own assigned learning | Can review **assigned** learners, not impersonate or overwrite their quizzes |
| \`org_admin\` | Super Admin (Sarah/Fridah) | Administers assignments, may oversee reviews, previews separately |
| Test learner (specific \`employee\` account) | Same onboarding plus **explicit test-only reset** | Only test-account history may be reset |
| Pending invitation | No active learning dashboard yet | None until verified sign-in and account claim |

The **learning profile** is a personal record independent of role; all active accounts can view their *own* evidence. It does not currently make AI-based assessments or dynamically branch lessons.

## 2. Top-level route map — what really exists

| URL or screen | Access | Entered from | Next actions / destinations | Save semantics |
|---|---|---|---|---|
| \`/preview/aspectus-welcome.html\` | Public sign-in page | Shared link or signed-out redirect | “How it works” opens modal; enter email → magic link | No learning data |
| \`/aspectus/auth/callback\` | Token verification | Magic link | Exchange/verify token; claim preapproved pending account → \`/aspectus\`; on error → sign-in | Creates authenticated session |
| \`/aspectus\` → **Home** | All signed-in accounts | Callback, Back to Hub, nav | Branches by role; “My profile” → \`/aspectus/profile\`; “My learning profile” → \`/aspectus/learning-profile\` | Dashboard reads live records |
| \`/aspectus\` → **Learning** | Learners and reviewer roles | Home “Open current module,” “Learning roadmap,” nav “Learning modules” | Module cards; lessons; student assignment; reviewer observed learner roadmap or own learning | Quiz/lesson/assignment only in real learner mode |
| Lesson overlay \`/preview/aspectus-staged-learning.html?... \` | Embedded in /aspectus | Open module (when allowed) | Baseline (Module 1) → lesson stages → quiz → “Open assignment”; “Save & exit” returns to /aspectus learning | Browser state plus best-effort server lesson-step sync; quiz saved via verified RPC |
| \`/aspectus\` → **Activity** | Learners / reviewers | “My feedback,” “Reviews,” “Track submission,” nav | Learner sees submissions/reviews; reviewer selects filters and decision buttons | Reviewer draft auto-saves privately; decision finalizes |
| \`/aspectus/profile\` | All active accounts | Home “My profile” | Choose photo → Save / Remove; “My learning profile” → \`/aspectus/learning-profile\`; Back → \`/aspectus\` | Private avatar object + personal avatar field only |
| \`/aspectus/learning-profile\` | All active accounts | Home or personal profile | “Refresh” rereads evidence; “Go to my learning home” → \`/aspectus\` | Read-only derived record; no AI inference yet |
| \`/aspectus/admin?view=overview\` | Super Admin | Home “Team learning access” | “View or change access” → Manage assignments; “Preview onboarding” → /aspectus/preview | Reads assignments |
| \`/aspectus/admin?view=mine\` | Super Admin | Home “My learning” | Manage my assignments; Professional Skills draft previews; onboarding preview | Own assignment status vs preview separated |
| \`/aspectus/admin?view=people\` | Super Admin | Home “Manage people & assignments” | Pick person; “Save learning modules only”; “Save reviewer access”; resend/copy invite | Mutates assignments and reviewer links **separately** |
| \`/aspectus/admin?view=invite\` | Super Admin | “+ Add a person” tab | Choose role → modules → optional reviewer coverage → Send invitation; returns to People | Creates pending account & invited modules; email delivery may fail independently |
| \`/aspectus/admin/health\` | Super Admin | Home “Learning Hub health” or admin nav | Refresh; inspect queue; go manage people; Back | Read-only; error telemetry only when a failing request is reported |
| \`/aspectus/admin/architecture\` | Super Admin | Home / admin nav | Switch role tabs; follow documented steps; open actual routes | Read-only flow inspection |
| \`/aspectus/preview\` | Super Admin | Admin “Preview this onboarding as a learner” | Choose any of eight modules, baseline, restart preview, return to library | **Browser-only admin practice** keyed to admin account; never changes Ian |
| \`/aspectus/skills/clear-workplace-communication\` | Draft preview | Admin My Learning / drafts | Follow standalone draft content; return to Admin | Draft; not officially assigned |
| \`/aspectus/skills/teamwork-and-collaboration\` | Draft preview | Admin My Learning / drafts | Follow standalone draft content; return to Admin | Draft; not officially assigned |
| \`/aspectus/leadership/strategy-to-execution\` | Super Admin | Home “Leadership working session” | 12 units → working notes, pilot feedback, export, reset | **Pilot v0.1; browser-only localStorage; not official learning or approval** |

There are older static HTML prototype files in \`/public/preview\`; the active role-aware app is \`/aspectus\`. Avoid sharing old prototype URLs as if they are the official learner dashboard.

## 3. Learner — Ian and future staff

\`\`\`mermaid
flowchart TD
  A[Invitation or known sign-in email] --> B[Welcome / magic-link form]
  B --> C[Auth callback & account claim]
  C --> D[Learner Home]
  D --> E[My profile & photo]
  E --> F[Personal learning profile]
  D --> G[Open current module]
  G --> H{Module 1 baseline?}
  H -->|Yes| I[Baseline questions]
  H -->|No| J[Lesson stages & scenario]
  I --> J
  J --> K[Knowledge check]
  K -->|Not passed| J
  K -->|Passed| L[Practical project form]
  L --> M[Submit assignment / file / link]
  M --> N[Awaiting review]
  N --> O[Reviewer decision]
  O -->|Accepted| P[Feedback / next module]
  O -->|Accepted with changes| P
  O -->|Redo requested| Q[Revise & resubmit]
  Q --> N
\`\`\`

**Exact controls and behaviors:**

- Home **“Open current module”** opens the embedded lesson. After passing the quiz it becomes **“Go to assignment.”**
- **“Review lesson again”** reopens a passed module without changing previous official scores.
- **“Save & exit”** closes the lesson overlay. Server save is asynchronous: this is not yet an acknowledged server-save button.
- **“Learning modules”** switches the central app screen, **not** a new pathname.
- **“Save draft” / “Restore draft”** in the project form use browser storage; attached files must be reattached.
- **“Submit to Brenda”** uploads permitted attachments and writes a \`learning_submissions\` row. The real role gate is the authenticated learner and module/quiz permissions.
- **“Track submission”** goes to Activity. Feedback and status from the review are shown there.
- **“Revise and resubmit”** returns to the submission form when the latest status is \`revision_requested\`.
- **“My profile”** allows image upload or removal. **“My learning profile”** summarizes only personal evidence.

**Module completion label:** Quiz passed + practical work submitted. This is **not the same as reviewer-approved**, and the current UI contains one inconsistent end-of-course message saying “approved” when only submitted. Correct in a subsequent tightly scoped UX pass.

## 4. Reviewer — Brenda

\`\`\`mermaid
flowchart TD
  A[Reviewer signs in] --> B[Reviewer Home]
  B --> C[Assigned learner list]
  C --> D[Learner roadmap & saved progress]
  B --> E[Reviews screen]
  E --> F[Open pending assignment]
  F --> G[Write private draft & publishing decision]
  G --> H{Reviewer decision}
  H -->|Approve as is| I[Approved]
  H -->|Approve with changes| J[Approved with notes]
  H -->|Request redo| K[Revisions requested]
  K --> L[Learner resubmits]
  L --> E
  B --> M[Own learning mode if assigned]
\`\`\`

- **“Review assignments”**, **“Review feedback”**, or navigation **“Reviews”** opens Activity filtered to reviewer-accessible submissions.
- **“View journey”** on learner tile opens their learning roadmap. It is observation, **not impersonation**.
- **Review feedback** auto-saves to \`aspectus_review_drafts\`, with browser recovery copy; draft is not visible to learner.
- **“Save draft now”** persists to the Hub and does not submit. **“Approve as is,” “Approve with changes,” and “Request redo”** call the server review procedure, persist final feedback and change status. Draft is then cleared.
- **“Learner & manager journeys”** can switch to the reviewer's **own coursework** where assigned.
- **Log issue / mark resolved / reopen** controls modify the separate \`aspectus_learning_issues\` log.
- If reviewer coverage is missing, dashboard must say **access missing**, never imply learner progress was erased.

## 5. Super Admin — Sarah / Fridah

\`\`\`mermaid
flowchart TD
  A[Super Admin Home] --> B[Team learning access]
  A --> C[My learning]
  A --> D[Review oversight]
  A --> E[People & assignments]
  A --> F[Hub health]
  A --> G[Architecture map]
  A --> H[Leadership PILOT]
  B --> I[Pick team member]
  I --> E
  C --> J[Professional Skills draft previews]
  C --> K[Admin onboarding preview]
  E --> L[Invite account]
  E --> M[Set course modules]
  E --> N[Set reviewer coverage]
  F --> O[Inspect missing access / failed saves]
  H --> P[12 workshop units & export draft]
\`\`\`

**Administration details:**

- **“Team learning access”** groups courses by track for users and pending invites; **“View or change access”** selects person in People tab.
- **“My learning”** shows own modules separately from any courses supervised.
- **“+ Add a person”** collects sign-in email, name, role, module assignments and optional reviewer coverage. It creates pre-approved access. Invitation email delivery is a separate step and may require retry.
- **“Save learning modules only”** changes who studies what; it does **not** revoke review permissions.
- **“Save reviewer access”** explicitly changes whose work a reviewer sees, with confirmation on removal.
- **“Preview this onboarding as a learner”** opens /aspectus/preview. All eight modules are accessible in any order; admin browser practice **never modifies Ian**.
- **“Learning Hub health”** shows learners with recorded activity, pending work, reviewer coverage and reported save failures. A value of zero errors means none *reported*, not guaranteed zero errors.
- **Leadership pilot** is completely separate from Ian’s onboarding and from real approvals. Local draft notes should not contain confidential customer or personnel details.

## 6. Test learner

This is a separate account with the learner role. Its **“Reset test progress”** control is narrowly gated to that known test identity and invokes a dedicated RPC. Reset deletes the selected test learner's quiz/submission/review history; it cannot reset Ian. The test login should never be used as a proxy for confirming Ian’s actual progress.

## 7. Data, ownership and permission architecture

| Data | Source | Who writes | Who reads | How it affects the experience |
|---|---|---|---|---|
| Identity & role | \`users\`, \`aspectus_pending_accounts\`, Supabase Auth | Admin invitation + verified account claim | Signed-in user; Super Admin admin page | Role-based landing screen and access |
| Profile photo | \`users.avatar_url\` + private \`aspectus-avatars\` bucket | Authenticated user via restricted RPC + own storage folder | User and active org colleagues using signed URLs | Avatar displayed on personal profile/home |
| Assigned modules | \`aspectus_module_assignments\` | Super Admin via controlled RPC | Learner, authorized reviewer/admin | Which courses appear |
| Reviewer coverage | \`aspectus_reviewer_assignments\` | Super Admin via separate controlled RPC | Reviewer, Super Admin | Which learner records and queues reviewer sees |
| Lesson steps | \`aspectus_lesson_progress\` | Learner session from embedded lesson sync | Learner; assigned reviewer/admin | Resume/started indicator |
| Quiz record | \`aspectus_quiz_attempts\` | Server-verified quiz RPC | Learner; assigned reviewer/admin | Knowledge check, pass counts |
| Practical work | \`learning_submissions\` + private \`aspectus-assignments\` storage | Learner | Learner; assigned reviewer/admin | Awaiting review, revision and completion |
| Review draft | \`aspectus_review_drafts\` | Assigned reviewer | **Same reviewer only** | Safe resumption; not yet learner feedback |
| Final review | \`learning_reviews\` + submission status | Assigned reviewer via server RPC | Learner and allowed reviewer/admin | Approval or changes requested |
| Issues | \`aspectus_learning_issues\` | Reviewer/admin | Authorized team oversight | Operational QA follow-up |
| Save errors | \`aspectus_save_errors\` | Client best-effort telemetry | Super Admin only | Diagnose failures, not exhaustive |
| My learning profile v0 | Derived from assigned modules, quiz, lesson, submission and review tables | No separate writes | **Self only** | Evidence counts and transparent next-step suggestion |
| Admin onboarding practice | Browser localStorage namespace | Admin only | Same admin browser | Independent practice; not official |
| Strategy to Execution pilot | Browser localStorage key | Admin pilot facilitator | Same browser | Working notes and .md export; not official |

**Future adaptive learner profile architecture (not live yet):**

1. Attach skill tags and learning objectives to each **question, scenario and practical assignment**; include content version, difficulty and rubric.
2. Record per-answer events (option chosen, retries, hint used, response time *if appropriate*, and answer validity), while keeping private responses appropriately scoped. Capture explicit learner consent and avoid sensitive content.
3. Aggregate evidence at **skill × learner** level, with number of observations, type (recall/application), date, validity and uncertainty. Quizzes alone must not assert workplace competency.
4. Run a transparent recommendation engine first: “You missed two questions on handovers → practice one scenario,” with a human reviewer approving any high-stakes interpretation.
5. Add AI explanations and personalized practice only after enough validated data exist. Display *why* an intervention was recommended; allow users to challenge it and keep personal profile changes separate from managerial evaluation.
6. Measure effectiveness: follow-up practice, actual task quality, retention and employee acceptance. Do not claim that more clicks prove mastery.

## 8. Navigation / button inventory and expected return path

| Button / link | Location | Destination or action | Gate / note |
|---|---|---|---|
| “How it works” | Welcome | On-page help modal | Public |
| “Continue with email” | Welcome | OTP email; callback → /aspectus | Invited or already registered |
| “My profile” | All homes | /aspectus/profile | Active authenticated user |
| “Choose a photo” | Profile | File picker → preview | JPG/PNG/WebP ≤2 MB |
| “Save profile photo” | Profile | Private storage + own avatar RPC | Never role/learning update |
| “Remove photo” | Profile | Clear own path and delete old object | Never deletes other data |
| “My learning profile” | Home/profile | /aspectus/learning-profile | Self evidence only |
| “Refresh” | Learning profile | Re-query personal evidence | Read only |
| “Open current module” | Learner home | /aspectus Learning → lesson overlay | Sequential progression |
| “Go to assignment” | Learner home | /aspectus Learning → form | After passed quiz |
| “Review lesson again” | Learner library | Lesson overlay with revisit mode | Previous score unaffected |
| “Save & exit” | Lesson overlay | Close overlay | Server write acknowledgement not guaranteed yet |
| “Save draft” / “Restore draft” | Assignment form | Browser localStorage | Reattach files |
| “Submit to Brenda” | Assignment form | Uploaded files + submission row → Activity | Server writes |
| “View feedback” / “Track submission” | Learner home/learning | /aspectus Activity | Own records only |
| “Review assignments” | Reviewer home | /aspectus Activity | Reviewer-assigned learners only |
| “View journey” | Reviewer home | /aspectus Learning (observed learner) | Read-only observation |
| “Save draft now” | Review editor | Private reviewer draft | Not final review |
| “Approve as is” | Review editor | Final review, approved | Permission + target submission |
| “Approve with changes” | Review editor | Final review, accepted with feedback | Feedback required |
| “Request redo” | Review editor | Revisions requested; learner resubmits | Feedback required |
| “Team learning access” | Super Admin home | /aspectus/admin?view=overview | Super Admin |
| “My learning” | Super Admin home | /aspectus/admin?view=mine | Super Admin |
| “Manage people & assignments” | Super Admin home | /aspectus/admin?view=people | Super Admin |
| “+ Add a person” | Admin nav | Admin invite form | Super Admin |
| “Save learning modules only” | Admin People | Separate learning assignment RPC | Super Admin |
| “Save reviewer access” | Admin People | Separate reviewer coverage RPC | Super Admin |
| “Send invitation” / “Resend invitation” | Admin | Edge email function | Email delivery needs confirmation |
| “Preview onboarding” | Admin overview/mine | /aspectus/preview | Isolated Super Admin practice |
| “Choose any module” | Admin preview | Selected lesson within preview iframe | No sequential gate |
| “Restart this preview” | Admin preview | Clears selected browser practice state | Never Ian records |
| “Learning Hub health” | Admin/home | /aspectus/admin/health | Read only |
| “Architecture map” | Admin/home | /aspectus/admin/architecture | Read only |
| “Leadership working session” | Super Admin home | /aspectus/leadership/strategy-to-execution | Pilot; browser only |
| “Export working notes” | Leadership pilot | Downloads Markdown draft | Not an approved strategy |
| “Reset test progress” | Test learner Learning | Test-only server reset RPC | Explicit test account only |

## 9. Risk register and audit findings

| Priority | Finding | Evidence / impact | Recommended next action |
|---|---|---|---|
| High | We lack a full signed-in clickthrough for all roles, particularly the invitation → quiz → submission → review → revision loop | Source and RLS checks support the path but do not prove the browser sequence works | Execute role-specific acceptance test |
| High | “Save & exit” does not await a confirmed server lesson save | Lesson events are asynchronous; browser/local state exists | Add explicit “Saved to Hub” receipt before claiming safe exit |
| Medium | Official module-completion text sometimes says “approved” when it only means “submitted” | Completion calculation is quiz passed + submission present | Correct that wording consistently |
| Medium | Reviewer access errors were previously displayed as missing progress | Reviewer scoping hides records when assigned reviewer connection is missing | Preserve missing-access empty states and test removal/reassignment |
| Medium | Reviewer and learner private drafts have different save semantics | Review drafts use Supabase; assignment drafts and leadership pilot use browser storage | Label each clearly and plan cross-device draft support |
| Medium | Professional Skills drafts are not yet active assigned courses | Admin preview routes, no published enrollment | Keep visible “draft” states and avoid false completion metrics |
| Medium | Leadership strategy pilot has no shared session or approval system | Local storage and export only | Test first facilitated workshop before designing organizational workflow |
| Medium | Adaptive profile is **not AI-powered** | Quiz attempts and project status exist, but no skill-tagged answer event model | Introduce evidence schema, rubrics, and explainable recommendations |
| Low | Some role labels / copy refer specifically to Ian and Brenda | Hardcoded text in shared components | Generalize after testing the exact first pilot |
| Low | Account profile/photo is self-service, but profile cards do not yet use every teammate's photo | New avatar lives on personal profile and home; team list remains text | Optional later enhancement |

## 10. Acceptance tests before declaring the architecture “working”

1. **Account claim:** Invite a fresh test email; complete email verification; confirm role, assigned modules and return URL.
2. **Learner:** Verify real learner sees only own modules; complete baseline, lesson, quiz, project; refresh; resume across devices; check status.
3. **Reviewer:** Confirm assigned learner visible and unassigned learner hidden; save draft; refresh; approve / request changes; verify learner sees final feedback.
4. **Revision:** Request redo, resubmit, verify latest version and history; approved work not overwritten.
5. **Super Admin:** Invite, assign modules, change reviewer coverage separately; revoke and restore reviewer without deleting work; inspect health dashboard.
6. **Admin preview:** Run each module independently and restart practice; verify no real learner or review record changes.
7. **Profile:** Each role uploads photo; refresh; ensure avatar persists; another organization cannot read it; remove photo.
8. **Learning profile:** Compare every displayed metric with source rows; do not show skill mastery labels without evidence.
9. **Pilot boundary:** Leadership session is marked PILOT, isolated from official onboarding and exportable.
10. **Accessibility/mobile:** Test keyboard navigation, focus behavior, labels, small screens and avatar crop.

**Release gate:** A deployed READY build + database permission checks are necessary but insufficient. Mark “fully working” only after the signed-in end-to-end tests pass for Learner, Reviewer and Super Admin. Do not use Ian's real account or submissions for destructive tests.
