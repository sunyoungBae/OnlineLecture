# OnlineLecture Development Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store the approved MVP as a dependency-aware, junior-executable task system with visible progress, safe parallel groups, common rules, and a runnable consistency check.

**Architecture:** Markdown task cards with fixed YAML front matter are the source of truth. A dashboard and master plan summarize those cards, while one dependency-free shell validator checks their schema, IDs, dependencies, statuses, file ownership, and dashboard coverage. Repository rules and safe environment/MCP examples provide shared execution constraints without storing credentials.

**Tech Stack:** Markdown, POSIX shell plus standard `awk`/`grep`/`sed`, Git

## Global Constraints

- Do not add runtime or package-manager dependencies for the harness.
- Task statuses are exactly `blocked`, `ready`, `in_progress`, `review`, or `done`.
- Task types are exactly `feature`, `migration`, `config`, `docs`, or `manual-checkpoint`.
- Every task card uses the exact front matter key order defined by the harness design.
- Cards are the state source of truth; `docs/tasks/README.md` must list every task ID exactly once.
- Parallel cards must have disjoint `owned_files`; common manifests, migrations, route indexes, schemas, test configuration, and environment files belong to `shared_files` and an integration owner.
- No real secrets, account IDs, project references, user data, or signed URLs may be committed.
- Database changes are new version-controlled files under `supabase/migrations`; applied migrations are never edited.
- Feature behavior follows red-green-refactor. Docs, config, and manual checkpoints use their type-specific verification contract.
- Commit after each independently verified task using the message specified by that task.

---

### Task 1: Define the task-card contract

**Files:**
- Create: `docs/tasks/TEMPLATE.md`
- Create: `docs/tasks/CONTRIBUTING.md`
- Modify: `docs/superpowers/specs/2026-08-02-development-harness-design.md`

**Interfaces:**
- Consumes: the status, card contract, ownership, review, and validation rules in the harness design
- Produces: the canonical front matter schema and task lifecycle used by every MVP card and the validator

- [ ] **Step 1: Create the canonical template**

Use this exact front matter shape and ordering in `docs/tasks/TEMPLATE.md`:

```yaml
---
id: P00-T00
title: Replace with a concrete deliverable
status: blocked
type: docs
depends_on: []
parallel_group: ""
owner: ""
started_at: ""
blocked_reason: dependency
owned_files: []
shared_files: []
reviewer: ""
review_commit: ""
---
```

Below it provide these required headings: `목표`, `범위`, `제외`, `선행조건과 차단 해제`, `파일`, `인터페이스`, `실행 순서`, `검증`, `인수 조건`, `리뷰 증거`, `커밋`. Explain that arrays remain one-line bracket arrays and timestamps use ISO 8601 with a timezone.

- [ ] **Step 2: Document state transitions and type-specific checks**

In `docs/tasks/CONTRIBUTING.md`, document:

```text
blocked -> ready -> in_progress -> review -> done
```

Require `dependency|external|decision` for blocked cards, an empty `blocked_reason` otherwise, `owner` and `started_at` at `in_progress`, an implementation commit at `review`, and a different reviewer plus `review_commit` at `done`. Define RED/GREEN evidence for `feature` and behavioral `migration`, command evidence for `config`, link/schema evidence for `docs`, and environment/approver evidence for `manual-checkpoint`.

- [ ] **Step 3: Reconcile the design vocabulary**

Check that the harness design names every front matter key from the template, including `started_at`, and that its lifecycle rules match `CONTRIBUTING.md`. Update only contradictions.

- [ ] **Step 4: Verify the contract files**

Run:

```bash
test -f docs/tasks/TEMPLATE.md
test -f docs/tasks/CONTRIBUTING.md
rg -n '^id: P00-T00$|^status: blocked$|^type: docs$|^blocked_reason: dependency$' docs/tasks/TEMPLATE.md
rg -n 'blocked -> ready -> in_progress -> review -> done' docs/tasks/CONTRIBUTING.md
git diff --check
```

Expected: every command exits 0 and `git diff --check` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add docs/tasks/TEMPLATE.md docs/tasks/CONTRIBUTING.md docs/superpowers/specs/2026-08-02-development-harness-design.md
git commit -m "docs: define task card workflow"
```

### Task 2: Establish repository-wide worker rules

**Files:**
- Create: `AGENTS.md`
- Create: `.env.example`
- Create: `.codex/config.toml.example`

**Interfaces:**
- Consumes: security, migration, TDD, design-token, MCP, and commit rules from the product and harness designs
- Produces: inherited instructions for all later workers and the safe names/configuration surface for external services

- [ ] **Step 1: Write `AGENTS.md`**

Include exact sections for source of truth, task claiming and status changes, commands, TDD by task type, migrations/RLS, design and accessibility, secrets, file ownership, commits, and completion. State that initial scaffold task P01-T01 must replace provisional command names with real scripts, after which the required completion commands are `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, and `npm run build`.

- [ ] **Step 2: Add the environment variable contract**

Create `.env.example` with names only and comments separating browser-safe and server-only values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
STORAGE_ALERT_RECIPIENT=
NEXT_PUBLIC_SITE_URL=
```

- [ ] **Step 3: Add a safe MCP example**

Create `.codex/config.toml.example` as commented documentation, not an active connection. It must state: official shadcn registry only; Supabase limited to one development project with `read_only=true`; official Playwright MCP in isolated headless mode; placeholders must be replaced locally and credentials must never be committed. Do not invent executable keys whose support has not been verified against current official documentation.

- [ ] **Step 4: Verify rule coverage and secret safety**

Run:

```bash
rg -n 'npm run lint|npm run typecheck|npm run test:e2e|supabase/migrations|44px|WCAG AA|service role' AGENTS.md
awk -F= '/^[A-Z0-9_]+=/{if ($2 != "") exit 1}' .env.example
! rg -n 'eyJ[A-Za-z0-9_-]{20,}|re_[A-Za-z0-9_]{16,}' .env.example .codex/config.toml.example
git diff --check
```

Expected: every command exits 0 and the secret scan has no matches.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md .env.example .codex/config.toml.example
git commit -m "chore: establish repository working rules"
```

### Task 3: Map the MVP into dependency-aware work packages

**Files:**
- Create: `docs/superpowers/plans/2026-08-02-online-lecture-mvp.md`

**Interfaces:**
- Consumes: both approved design documents and the task-card contract
- Produces: phase definitions P00 through P09, stable task IDs, dependency graph, parallel groups, file ownership map, external checkpoints, and requirement traceability for Task 4

- [ ] **Step 1: Define phases and stable tasks**

Create one master plan containing these phases and IDs:

```text
P00 Harness: P00-T01 through P00-T05
P01 Foundation: P01-T01 scaffold, P01-T02 design system, P01-T03 public shell
P02 Data: P02-T01 schema, P02-T02 RLS, P02-T03 storage policies/types
P03 Identity: P03-T01 OAuth, P03-T02 onboarding, P03-T03 authorization/admin bootstrap
P04 Courses: P04-T01 member catalog/player, P04-T02 admin course CRUD, P04-T03 lesson CRUD/order
P05 Community: P05-T01 editor/post CRUD, P05-T02 board query/search, P05-T03 comments/moderation
P06 Files: P06-T01 validation/quota, P06-T02 post files, P06-T03 lesson files, P06-T04 alerts/recovery
P07 Polish: P07-T01 shared states, P07-T02 accessibility/responsive audit
P08 Release: P08-T01 full verification, P08-T02 load smoke, P08-T03 Vercel deploy
P09 Manual acceptance: P09-T01 OAuth/video, P09-T02 email/advisor
```

- [ ] **Step 2: Define dependencies and parallel groups**

Add a Mermaid dependency graph and a table for every task with status, dependencies, parallel group, owned area, shared/integration files, and deliverable. P01-T02 and P01-T03 may run in parallel after P01-T01. In later phases, only place tasks in the same parallel group when their owned files are disjoint and shared-file integration has a named owner.

- [ ] **Step 3: Add requirement traceability**

Map every section of the product design to at least one task ID or P09 manual checkpoint, including license recording, 30-request load smoke, private downloads, 80% alert reset, 95% block/recovery, RLS role cases, accessibility, and all explicit exclusions.

- [ ] **Step 4: Verify plan completeness**

Run:

```bash
for phase in P00 P01 P02 P03 P04 P05 P06 P07 P08 P09; do rg -q "$phase" docs/superpowers/plans/2026-08-02-online-lecture-mvp.md; done
for term in '80%' '95%' '30' 'WCAG AA' 'RLS' '라이선스' '명시적 제외'; do rg -q "$term" docs/superpowers/plans/2026-08-02-online-lecture-mvp.md; done
git diff --check
```

Expected: every phase and traceability term is present; all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-08-02-online-lecture-mvp.md
git commit -m "docs: map MVP delivery dependencies"
```

### Task 4: Create junior-executable cards and the progress dashboard

**Files:**
- Create: `docs/tasks/README.md`
- Create: `docs/tasks/phase-00/*.md`
- Create: `docs/tasks/phase-01/*.md`
- Create: `docs/tasks/phase-02/*.md`
- Create: `docs/tasks/phase-03/*.md`
- Create: `docs/tasks/phase-04/*.md`
- Create: `docs/tasks/phase-05/*.md`
- Create: `docs/tasks/phase-06/*.md`
- Create: `docs/tasks/phase-07/*.md`
- Create: `docs/tasks/phase-08/*.md`
- Create: `docs/tasks/phase-09/*.md`

**Interfaces:**
- Consumes: the canonical card template and every task row, dependency, ownership decision, and acceptance criterion from the master MVP plan
- Produces: one independently executable card per master-plan task and the human-readable state dashboard

- [ ] **Step 1: Create all cards from the canonical schema**

Create one kebab-case Markdown file for each ID in Task 3. P00 harness cards are `done` only when their referenced commit exists; P01-T01 is `ready`; all unmet dependency cards are `blocked` with `blocked_reason: dependency`; external acceptance cards use `blocked_reason: external`. Each body must give exact paths, consumed/produced interfaces, ordered test or verification actions, expected failure/pass evidence, acceptance criteria, exclusions, and a commit message.

- [ ] **Step 2: Make parallel ownership explicit**

Populate `owned_files` and `shared_files` in every card. Cards in a shared `parallel_group` must have disjoint `owned_files`. Assign shared manifests and integration points to one named integration card rather than allowing parallel modification.

- [ ] **Step 3: Create the dashboard**

In `docs/tasks/README.md`, explain the five statuses, show each phase with `done/total`, list every task ID exactly once in a table, show `in_progress`, `review`, blocked external actions, and the next `ready` tasks. State that card front matter is authoritative and the dashboard changes in the same commit as status changes.

- [ ] **Step 4: Spot-check junior executability**

Without implementing the product, dry-run P01-T01 and two later cards: verify a new worker can identify the first file, first command, expected RED result or config evidence, completion command, dependency, and commit boundary without opening the full product design.

- [ ] **Step 5: Verify card count and formatting**

Run:

```bash
test "$(find docs/tasks/phase-* -name '*.md' | wc -l | tr -d ' ')" -eq 31
test "$(rg -l '^id: P[0-9]{2}-T[0-9]{2}$' docs/tasks/phase-* | wc -l | tr -d ' ')" -eq 31
test "$(rg -l '^status: (blocked|ready|in_progress|review|done)$' docs/tasks/phase-* | wc -l | tr -d ' ')" -eq 31
git diff --check
```

Expected: 31 cards, 31 valid ID lines, 31 valid status lines, and no whitespace errors.

- [ ] **Step 6: Commit**

```bash
git add docs/tasks/README.md docs/tasks/phase-*
git commit -m "docs: add executable MVP task cards"
```

### Task 5: Add and prove the harness consistency check

**Files:**
- Create: `scripts/check-harness.sh`
- Create: `scripts/test-check-harness.sh`
- Modify: `AGENTS.md`
- Modify: `docs/tasks/README.md`

**Interfaces:**
- Consumes: the fixed card schema, status rules, dependencies, ownership rules, and dashboard coverage contract
- Produces: `./scripts/check-harness.sh`, which exits 0 for a consistent harness and nonzero with a specific diagnostic for the first inconsistency

- [ ] **Step 1: Write failing black-box checks**

Create `scripts/test-check-harness.sh`. It must copy a minimal valid fixture into a directory from `mktemp -d`, run the checker through a `HARNESS_ROOT` override, and assert success. Then mutate separate fixture copies and assert failure messages for: duplicate ID, unknown dependency, invalid status, missing blocked reason, nonempty blocked reason on a ready card, parallel `owned_files` overlap, missing dashboard ID, and duplicate dashboard ID.

- [ ] **Step 2: Run the tests to verify RED**

Run:

```bash
chmod +x scripts/test-check-harness.sh
./scripts/test-check-harness.sh
```

Expected: nonzero exit because `scripts/check-harness.sh` does not exist.

- [ ] **Step 3: Implement the minimum POSIX-shell validator**

Create `scripts/check-harness.sh` with `set -eu` and `HARNESS_ROOT=${HARNESS_ROOT:-.}`. Use only standard shell, `awk`, `grep`, `sed`, `find`, and `sort`. Validate every required front matter key and its fixed order, ID/file uniqueness, allowed values, dependency existence, blocked-reason rules, parallel owned-file overlap, and exactly-one dashboard occurrence. Print `Harness check passed: 31 task cards` for the real repository.

- [ ] **Step 4: Run focused and real-repository checks**

Run:

```bash
chmod +x scripts/check-harness.sh
./scripts/test-check-harness.sh
./scripts/check-harness.sh
```

Expected: fixture tests pass and the real check prints `Harness check passed: 31 task cards`.

- [ ] **Step 5: Document the command and commit**

Add `./scripts/check-harness.sh` to `AGENTS.md` and the dashboard's contributor instructions. Then run:

```bash
git diff --check
./scripts/test-check-harness.sh
./scripts/check-harness.sh
git add scripts/check-harness.sh scripts/test-check-harness.sh AGENTS.md docs/tasks/README.md
git commit -m "test: validate development harness"
```

Expected: all checks pass before the commit.

## Plan self-review result

- Spec coverage: H1–H5 cover the card contract, shared rules, dependency map, all executable cards, dashboard, consistency checker, review evidence, parallel ownership, and external checkpoints.
- Deliberate simplification: no task generator, YAML parser, package dependency, CI service, or active credential-bearing MCP configuration is added.
- Type consistency: task ID, state, type, ownership, reviewer, and blocker fields use the same names in every task.
