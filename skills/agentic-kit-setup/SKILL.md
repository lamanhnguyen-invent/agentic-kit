---
name: agentic-kit-setup
description: Walk the user through onboarding their personal and project CLAUDE.md files with Invent's agentic-coding guidelines and workflow, the repo type (demo or prod), the project's secret-file deny rules, its pre-commit quality gate, and an optional personal statusline and notification. Backs the repo's Claude Code files up first and ends by running repo-setup, which moves instructions into rules, skills, hooks or permissions. Use when the user runs /agentic-kit-setup or asks to set up Invent's Claude Code conventions.
# Any path to backup.js: the plugin path may contain a space and get quoted, and on Windows Claude may run it via PowerShell.
# CLAUDE_SKILL_DIR, not CLAUDE_PLUGIN_ROOT: the kit also installs as plain copies in ~/.claude (SETUP.md).
allowed-tools: Bash(node *repo-setup/scripts/backup.js*) PowerShell(node *repo-setup/scripts/backup.js*)
---

Walk the user through this step by step, one question at a time via AskUserQuestion.
Never silently rewrite a file — always show the exact block you intend to
insert and ask the user for explicit confirmation before writing it. The one
exception is Step 7, which the backups cover.

## Step 0 — Check Node, back up

First run `node --version`. The kit's hooks are Node scripts, and without
Node they fail silently, so none of its guards would run. If the command
fails or prints a version below 18, tell the user to install Node.js 18 or
newer from the pre-approved software in the Company Portal (an older version
first has to be uninstalled there), restart Claude Code and run
`/agentic-kit-setup` again, and stop.

Then find, with Glob, the files this setup may change:

- `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`
- `CLAUDE.md` files in subdirectories
- `.claude/rules/**/*.md`, `.claude/skills/*/SKILL.md`, `.claude/commands/**/*.md`, `.claude/agents/*.md`
- `.claude/settings.json`, `.pre-commit-config.yaml`

Skip `node_modules`, `.git`, `.claude/worktrees` and `.repo-setup-backup`.
Never back up `.claude/settings.local.json`, `.mcp.json` or `.env` files.

- If none exist: say there is nothing to back up and go to Step 1.
- Otherwise back them up without asking:

      node "${CLAUDE_SKILL_DIR}/../repo-setup/scripts/backup.js" save .repo-setup-backup <file> <file> ...

  Show the script's output and remember the restore command it prints for
  Step 8. If the script fails, stop.

## Step 1 — Personal CLAUDE.md (~/.claude/CLAUDE.md)

1. Check whether `~/.claude/CLAUDE.md` exists.
   - If missing: ask the user whether to create it with Karpathy's four
     guidelines below.
   - If it exists: read it and use your judgment to check whether it already
     covers the four guidelines (Think Before Coding, Simplicity First,
     Surgical Changes, Goal-Driven Execution) — wording may differ, match on
     substance, not exact headers. This is a one-time setup step, so it's
     fine to read the whole file.
     - If all four are covered: tell the user this is already set up, move
       to Step 2.
     - If missing/partial: show the missing block and ask whether to append it.

Guideline block to insert if needed:

    ## 1. Think Before Coding
    State assumptions explicitly. If uncertain, ask. If multiple interpretations
    exist, present them. Push back on unneeded complexity.

    ## 2. Simplicity First
    Minimum code that solves the problem. No speculative abstractions or
    unrequested flexibility.

    ## 3. Surgical Changes
    Touch only what you must. Don't refactor or "improve" adjacent code.
    Match existing style.

    ## 4. Goal-Driven Execution
    Turn tasks into verifiable success criteria before looping on them.

## Step 2 — Repo type: demo or prod

The answer is used by Steps 3 to 5 and by the `git-safety` hook, so ask it
for every repo, not only Python ones.

1. If `./.claude/settings.json` already sets `env.INVENT_REPO_TYPE`, show the
   value and ask whether to keep it. Otherwise ask via AskUserQuestion:
   **"Is this a demo or a prod repo?"**
   - **Demo** — one-off demo, spike, prototype or hackathon app. Committing
     and pushing on main is fine: `git-safety` only blocks deleting or
     force-pushing main/master and `gh repo delete` / `gh release delete`.
     Pre-commit checks are advisory.
   - **Prod** — code that will be maintained. `git-safety` blocks commits,
     merges, rebases, resets and pushes on main/master, and merging or
     closing PRs and issues via `gh`; it blocks `git add .`/`-A` and
     `git commit --no-verify`, and asks the user before every commit.
     Pre-commit checks are blocking.
   In both, `block-dangerous-commands` keeps blocking `git reset --hard`
   and `git clean -f`.
2. Remember the answer; Step 4 writes it to `.claude/settings.json`.

## Step 3 — Project CLAUDE.md (./CLAUDE.md)

Claude Code reads `AGENTS.md` only while the project has no `CLAUDE.md`, so a
`CLAUDE.md` next to an `AGENTS.md` must import it with an `@AGENTS.md` line.

1. Find the project `CLAUDE.md`. Claude Code loads `./CLAUDE.md` and
   `./.claude/CLAUDE.md` alike, so:
   - only `./.claude/CLAUDE.md` exists → it is the project `CLAUDE.md`;
   - both exist → `./CLAUDE.md` is the project `CLAUDE.md`;
   - neither exists → there is none.
   "`CLAUDE.md`" below means that file; never create a second one next to
   an existing one. Look for an existing Invent block in both files: if one
   holds it, that is the file to update. Then check whether `./AGENTS.md`
   exists.
   - **No `CLAUDE.md`, no `AGENTS.md`:** give the repo a base `CLAUDE.md`
     first, so the Invent block is not all it holds: tell the user you are
     starting the built-in `/init`, and invoke the `init` skill with the
     Skill tool. If the Skill tool can't run it, tell the user to type
     `/init` and to run `/agentic-kit-setup` again afterwards, and stop.
     Then show the block below and ask whether to append it.
   - **No `CLAUDE.md`, but `AGENTS.md`:** don't run `/init`. Show a
     `CLAUDE.md` of an `@AGENTS.md` line, a blank line and the block below,
     and ask whether to create it.
   - **`CLAUDE.md` and `AGENTS.md`, without an `@AGENTS.md` line:** tell the
     user Claude ignores `AGENTS.md` right now, and ask whether to add
     `@AGENTS.md` as the first line of `CLAUDE.md`. Then continue with the
     next case.
   - **`CLAUDE.md` exists:** read it and use your judgment to check whether it
     already has an "Invent Project Guidelines" section (substance, not
     exact title).
     - If present, marked v0.9, stating the same repo type, and mentioning
       pre-commit only if Step 5 applies to this repo: tell the user it's
       already set up, move to Step 4.
     - If present but older (v0.8, v0.7, v0.6, v0.5, v0.4, v0.3, v0.2, v0.1 or unversioned), stating the
       other repo type, or differing on pre-commit: show the diff to the
       block below and ask whether to replace the old section with it.
     - If missing: show the block below and ask whether to append it.

Invent baseline block (v0.9). It is written for **prod**; for a **demo** repo,
swap in the demo lines listed after it.

    ## Invent Project Guidelines (v0.9)

    Repo type: **prod** (`INVENT_REPO_TYPE` in `.claude/settings.json`; don't
    change it yourself).

    ### Small or big?

    Size every coding task before you start. Don't announce the size; just
    act on it.

    - **Small (the default):** just do it, no workflow. Bug fix with a known
      cause, a change whose files you can name, config, copy, tests,
      dependency bumps, refactors inside one module, follow-ups in the same
      session, even if several files change.
    - **Big:** only if at least one applies: new behaviour with open
      requirements or design choices; changes a public API, data model,
      schema or migration; spans several modules or services; or the user
      asks for the workflow.
    - **Unsure:** ask once via AskUserQuestion ("Small: just do it" first,
      "Big: grill and write a plan" second). Don't start the workflow
      without a yes.

    The user can override your call at any point, also mid-workflow. Infer
    their intent rather than waiting for exact words: "just do it", "skip
    the plan" or "quick fix" mean small; "let's grill this" or "write a
    plan" mean big. Follow it without arguing for the workflow; name a real
    risk once at most.

    ### Committing

    - Never commit on your own. Propose the commit (files + message) and wait
      for the user's OK. `git-safety` then asks for a confirmation once more
      when you run `git commit`; that is intended, so tell the user it comes.
    - Never `git add .` or `git add -A`: the working tree may hold local
      working files that must not be committed.
    - Staging, in this order of preference:
      1. `git add <file> ...` with explicit names.
      2. `git add -u` (tracked, modified files only).
      3. Untracked files only as a last resort, and never commit them without
         the user signing off on each one.

    ### Workflow for big tasks

    Suggested, not enforced. It pays off most in code you don't know yet.

    1. **Grill it** — stress-test the approach against the code and existing
       docs: ask the user to run `/grill-with-docs` (only the user can start
       it), or invoke the `grilling` and `domain-modeling` skills yourself.
       Put each round of questions into AskUserQuestion (max 4 per call,
       recommended answer as first option).
    2. **Plan it** — this is not a planning session: don't enter plan mode
       or explore the code again. Simply write an implementation plan or
       report of what was discussed so far. Create the feature branch, then
       write it to `plans/<branch name without prefix>.md`
       (`feature/PROJ-123-login` → `plans/PROJ-123-login.md`) using the
       template below. If the template needs something the grilling never
       settled, ask via AskUserQuestion rather than guess. Every acceptance
       criterion names the test or command that proves it. Keep the plan to
       the simplest version that meets the criteria (`ponytail`).
    3. **Approve it** — point the user to the plan file and wait for their
       approval before writing code. They may edit the file directly.
    4. **Implement it** — on the feature branch, never on main/master.
       Delegate to subagents capped at Sonnet (no higher-tier model per
       subagent); tell each one to read the plan file, which step to
       implement, and to follow this CLAUDE.md and the `ponytail` skill.
    5. **Verify it** — run the test for every acceptance criterion and the
       pre-commit hooks; fix until green. Tick each criterion in the plan
       file once its test passes.
    6. **Review it** — run the `pr-review` agent on the branch; it reads the
       plan file itself. It runs on Opus: don't override its model, the
       Sonnet cap is for implementation subagents only. Address its
       findings before opening the PR.

    Commit the plan file with the change, so reviewers see what was asked.

    Plan template. The plan is the one shared document for the user,
    reviewers and implementing agents: as long as the work needs, but it
    records decisions and results, not the conversation.

        # <ticket id> <title>

        ## Goal
        One or two sentences: what changes and why.

        ## Decisions
        What the grilling settled, one line per question.
        - **Q1 <question>** → <answer>. Why: <reason; rejected option>

        ## Acceptance criteria
        - [ ] AC1 <observable behaviour> — Test: <new|existing> `<test or command>`

        ## Out of scope
        - <raised during grilling, left out, and why>

        ## Implementation
        For the implementing agent: follow this CLAUDE.md, the `ponytail`
        skill and the project's `AGENTS.md` if there is one.

        Files:
        - `<path>`: <new | change | delete>, <what>
        - Read first: `<path>`, <why it matters>

        Steps:
        1. <change>, files: `<path>`, proves: AC1
           Only for a tricky step: a short code sketch (signature, key
           logic, edge case). It is guidance; check it against the code.

    ### Invent tooling (v0.9)

    - **Pre-tool-use hooks (active):** `protect-secrets` (Read/Edit/Write/Grep/
      Bash/PowerShell), `block-dangerous-commands` and `git-safety`
      (Bash/PowerShell). `git-safety` blocks commits, merges, rebases,
      resets and pushes on main/master — work on a feature branch. It also
      blocks `git add .`/`-A` and `git commit --no-verify`, and asks the
      user before every commit (see "Committing").
    - **Session-start hook (active):** `ponytail-activate` loads the
      `ponytail` ruleset into every session.
    - **Post-tool-use hook (active):** `format` formats every file you write
      or edit: `ruff format` for Python, the project's Prettier for JS/TS.
      The file on disk may differ from what you wrote; don't reformat by
      hand.
    - **Deny rules:** `.claude/settings.json` blocks reading and editing
      secret files (`.env`, keys, credentials). Don't work around them.
    - **Pre-commit hooks:** Python complexity (radon/xenon), lint and format
      (ruff), optional type check (ty); JS/TS lint and complexity (ESLint),
      format (Prettier), optional type check (tsc) — blocking in this prod repo; see
      `.pre-commit-config.yaml`. Never bypass them with `--no-verify`: if a
      hook blocks, fix the reported issue once; if it still fails, stop and
      ask the user.
    - **Testing guidelines:** none yet — TBD.

    If the user asks what Invent's hooks/pre-commit/testing setup is, report
    exactly the state above — don't invent details beyond what's listed.

Demo variant: replace these parts of the block, keep everything else.

- In the repo-type line, `**prod**` → `**demo**`.
- Leave out the whole "Committing" section: committing and staging are
  unrestricted in a demo repo.
- In "Plan it", the sentence starting "Create the feature branch" →

      A feature branch is optional in this demo repo. Write it to
      `plans/<branch name without prefix>.md`, or on main to
      `plans/<short-topic>.md`, using the template below.

- The first sentence of "Implement it" →

      4. **Implement it** — on a feature branch or directly on main; this is
         a demo repo.

- Append to "Review it": `If you worked on main, tell the agent which plan
  file and which commits to review.`
- In the hooks bullet, the `git-safety` sentences (from "`git-safety` blocks" to "(see
  "Committing")") →

      `git-safety` is relaxed in this demo repo: it only blocks deleting or
      force-pushing main/master and `gh repo delete` / `gh release delete`.

- In the pre-commit bullet, `blocking in this prod repo` → `advisory in this
  demo repo`.

Language variant: in the pre-commit bullet, keep only the languages Step 5
sets up hooks for (Python, JS/TS or both), and drop an optional type checker
the user declined.

No pre-commit variant: when Step 5 does not apply to this repo (see the check
at its top), the repo gets no pre-commit hooks, so the block must not
describe them. In either repo type:

- Leave out the "Pre-commit hooks" bullet of "Invent tooling".
- In "Verify it", `and the pre-commit hooks; fix until green` → `; fix until
  green`.

## Step 4 — Project settings: deny rules and repo type (./.claude/settings.json)

Claude Code's own permission rules stop Claude's file tools (Read, Edit,
Write, Grep, Glob) from touching these paths, on every OS. They don't
reliably stop shell commands such as `head .env`; the kit's `protect-secrets`
hook covers those. The `env` entry tells the `git-safety` hook the repo type from Step 2;
hooks read it on every call. Project settings are committed, so both apply
to everyone on the team.

1. Check whether `./.claude/settings.json` exists.
   - If missing: show the block below (with the repo type from Step 2) and
     ask whether to create the file with it.
   - If it exists: read it. Show which of the rules below are missing from
     `permissions.deny`, and whether `env.INVENT_REPO_TYPE` is missing or
     differs, and ask whether to update them. Keep every existing key, env
     variable and rule; never remove or reorder the user's rules, except
     the git rules below if the user agrees.
   - Git rules: list every `permissions.deny` rule on `git` or `gh` (e.g.
     `Bash(git push * main)`, `PowerShell(git push *)`), here, in
     `./.claude/settings.local.json` and in `~/.claude/settings.json`. Deny
     rules from all three add up and apply in demo and prod alike, and no
     hook can lift them, so they override the repo type: in a demo repo a
     denied push to main stays blocked. Branch protection is `git-safety`'s
     job, which follows the repo type, and `block-dangerous-commands` blocks
     force-pushes. For the rules in this file, ask via AskUserQuestion
     (multiSelect) which to remove. For the other two files, only name the
     rules and say the user can remove them there; don't edit those files.
2. Remind the user to commit `.claude/settings.json`. The repo type applies
   from the next tool call once the file is saved. Someone who needs a
   different value for themselves can set it in `.claude/settings.local.json`.
3. If the project is a git repo, check that `.env` files are git-ignored:
   `git check-ignore -q .env` and `git check-ignore -q .env.local` (they
   work even if the files don't exist). The deny rules only stop Claude;
   without an ignore entry a later `git add .` still commits the secrets.
   - Both ignored: say so and move on.
   - Otherwise: show the lines below and ask whether to append them to
     `./.gitignore` (create it if missing). Never remove existing lines.

         .env
         .env.*
         !.env.example
         !.env.sample
         !.env.template

   - If `.env` is already tracked (`git ls-files --error-unmatch .env`
     succeeds), the ignore entry won't untrack it: tell the user, and that
     `git rm --cached .env` stops tracking it while keeping the file. Don't
     run it yourself. If it was ever pushed, the secrets should be rotated.

Rules (bare names match at any depth in the project; a `!` rule carves an
exception out of the rules listed before it, so keep the order):

    {
      "env": {
        "INVENT_REPO_TYPE": "prod"
      },
      "permissions": {
        "deny": [
          "Read(.env)",
          "Read(.env.*)",
          "Read(!.env.example)",
          "Read(!.env.sample)",
          "Read(!.env.template)",
          "Edit(.env)",
          "Edit(.env.*)",
          "Edit(!.env.example)",
          "Edit(!.env.sample)",
          "Edit(!.env.template)",
          "Read(.envrc)",
          "Read(*.pem)",
          "Read(*.key)",
          "Read(*.p12)",
          "Read(*.pfx)",
          "Read(credentials.json)",
          "Read(secrets.json)",
          "Read(secrets.yaml)",
          "Read(secrets.yml)",
          "Read(secrets.toml)",
          "Read(~/.ssh/**)",
          "Read(~/.aws/**)"
        ]
      }
    }

## Step 5 — Pre-commit hooks (project)

Only applies to a git repository with Python or JS/TS code:

- **Python:** a `pyproject.toml`, a `uv.lock`/`poetry.lock`, or `.py` files
  anywhere in the repo (Glob `**/*.py`, skipping `.venv`, `node_modules` and
  `.git`).
- **JS/TS:** a `package.json` at the repo root; TypeScript if a
  `tsconfig.json` is there too.

A repo with both gets both sets of hooks in one `.pre-commit-config.yaml`; do
the steps below for each. Neither: say so and skip to Step 6. If
`git config core.hooksPath` is set (e.g. by husky), `pre-commit install`
refuses to run: tell the user and skip to Step 6.

1. Detect the environment manager:
   - Python: `uv.lock` present → `uv`; `poetry.lock` present (or
     `[tool.poetry]` in `pyproject.toml`) → `poetry`; otherwise → a plain
     venv/pip project.
   - JS/TS: `pnpm-lock.yaml` → `pnpm`; `yarn.lock` → `yarn`; `bun.lock` or
     `bun.lockb` → `bun`; otherwise → `npm`.
2. Use the repo type from Step 2 (don't ask again) and tell the user what it
   means here:
   - **Demo** — checks are *advisory*: findings are listed on every commit,
     but the commit goes through. The one exception is the formatter
     (`ruff format`, `prettier`): when it reformats a file, the commit stops
     once — `git add` and commit again.
   - **Prod** — checks are *blocking*. Python: a commit fails on any function
     of rank D or worse (complexity ≥ 21; rank C, 11–20, is still listed as a
     warning), on any `ruff` lint finding, and — if chosen below — on any
     `ty` type error. JS/TS: it fails on any ESLint error, on any function
     with complexity ≥ 21, and — if chosen below — on any `tsc` type error.
3. **Python:** ask via AskUserQuestion whether to add **ty**, a fast type checker
   (recommended for new code). It runs from the project's venv so it can see
   the project's dependencies, so it must be a dev dependency. Check whether
   it's installed (`uv run ty --version`, `poetry run ty --version`, or
   `ty --version` in the active venv); if not, show the exact command
   (`uv add --dev ty`, `poetry add --group dev ty`, or `pip install ty`) and
   ask for confirmation before running it. If they decline, leave it out.
4. **JS/TS:** the hooks run the project's own ESLint, Prettier and `tsc`
   from `node_modules`, so they must be dev dependencies.
   - Check `npx --no-install eslint --version` (9 or newer),
     `npx --no-install prettier --version` and, for TypeScript,
     `npx --no-install tsc --version`. If one is missing or ESLint is older,
     show the exact command (npm: `npm install --save-dev eslint @eslint/js
     globals prettier`, plus `typescript typescript-eslint` for TypeScript;
     `pnpm add -D`, `yarn add -D` or `bun add -d` with the same packages)
     and ask for confirmation before running it. If they decline, leave out
     the hooks whose tool is missing.
   - **TypeScript:** ask via AskUserQuestion whether to add **tsc** type
     checking (recommended). It checks the whole project from
     `tsconfig.json` on every commit that touches a TS file, so it can be
     slow in a big repo. If they decline, leave it out.
   - **ESLint config:** an `eslint.config.*` exists → keep it. Only a legacy
     `.eslintrc*` → ESLint 9 ignores it: tell the user that
     `npx @eslint/migrate-config <file>` converts it, don't convert it
     yourself, and leave the ESLint hook out until it is converted. None →
     show the config below and ask whether to create `eslint.config.mjs`.
   - **Prettier config:** none (`.prettierrc*`, `prettier.config.*` or a
     `"prettier"` key in `package.json`) → ask whether to create
     `.prettierrc.json` containing `{}`, so editors format like the hook.
   - Tell the user that everyone who commits needs the dependencies
     installed first (`npm install` or the equivalent); without
     `node_modules` the JS/TS hooks fail with `npx canceled due to missing
     packages`.
5. Check whether `.pre-commit-config.yaml` exists.
   - If missing: show the blocks for the chosen mode and languages (below),
     prefixed with a top-level `repos:` line, and ask to create the file.
   - If it exists: read it. If it already has a `radon-cc`, `xenon`, `ruff`,
     `ruff-check`, `ruff-format`, `ty`, `pylint`, `eslint`, `prettier` or
     `tsc` hook (also from `mirrors-eslint` / `mirrors-prettier`), tell the
     user and ask whether to replace it. Otherwise show the blocks and ask
     whether to append them under the existing `repos:` list.
6. Check whether `pre-commit` is available (`pre-commit --version`, or
   `uv run pre-commit --version` / `poetry run pre-commit --version`). If not,
   **never install it silently** — show the exact command for their
   environment (e.g. `uv add --dev pre-commit`, `poetry add --group dev
   pre-commit`, or `pip install pre-commit`; in a repo without Python,
   `uv tool install pre-commit` or `pipx install pre-commit`) and ask for
   confirmation first.
7. Run `pre-commit install` so the hooks fire on `git commit`. Then show the
   current state of the codebase **without changing any file**:
   - `SKIP=ruff-format,prettier pre-commit run --all-files` (PowerShell:
     `$env:SKIP='ruff-format,prettier'; pre-commit run --all-files`) for
     lint, complexity and types;
   - Python: `ruff format --check .` for formatting (`uvx ruff format
     --check .` if ruff isn't installed; skip it if neither works);
   - JS/TS: `npx --no-install prettier --check .` for formatting.
   Use the `uv run` / `poetry run` prefix from step 1 where needed. In prod
   mode on an existing codebase this may already fail — tell the user what
   fails and that they can either fix it or loosen the threshold (see the
   comments in the blocks); don't fix it yourself here. If files would be
   reformatted, say how many and ask whether to format them now as a
   separate commit (`pre-commit run ruff-format --all-files`,
   `pre-commit run prettier --all-files`) or leave it: each file then gets
   formatted the first time a commit touches it.

If a `uv` or `uvx` command fails with `invalid peer certificate` or
`UnknownIssuer`, a company proxy re-signs HTTPS: tell the user to set
`UV_SYSTEM_CERTS=1` (uv then trusts the Windows/macOS certificate store,
e.g. under `"env"` in `~/.claude/settings.json` or in the shell profile) and
retry. Don't switch off TLS checks.

radon, xenon and ruff are installed by pre-commit itself in isolated
environments — nothing to add to the project. `ty` runs from the project
venv: the block below uses `uv run --no-sync`, so a commit never re-syncs
the venv or rewrites `uv.lock` (and needs no network); use `poetry run` for
poetry, and drop the prefix for a plain venv (the venv must be active when
committing).

Demo block (advisory):

      - repo: https://github.com/astral-sh/ruff-pre-commit
        rev: v0.16.9
        hooks:
          # Advisory: lists lint findings, never blocks. Rules: ruff's defaults;
          # add more under [tool.ruff.lint] in pyproject.toml. Leave C901 off,
          # radon covers complexity.
          - id: ruff-check
            args: [--exit-zero]
            verbose: true
          # Formats Python files. Stops the commit once when it changes a file.
          - id: ruff-format
            types_or: [python, pyi]
      - repo: local
        hooks:
          # Advisory only: lists functions of rank C or worse (complexity >= 11),
          # never blocks. Raise to D to see less, lower to B to see more.
          # Ranks: A 1-5, B 6-10, C 11-20, D 21-30, E 31-40, F 41+.
          - id: radon-cc
            name: radon-cc (complexity, advisory)
            entry: radon cc --min C --show-complexity
            language: python
            additional_dependencies: [radon==6.0.1]
            types: [python]
            verbose: true
            exclude: ^(tests/|scripts/)

Prod block (blocking):

      - repo: https://github.com/astral-sh/ruff-pre-commit
        rev: v0.16.9
        hooks:
          # Blocking: fails on any lint finding. Rules: ruff's defaults; add
          # more under [tool.ruff.lint] in pyproject.toml. Leave C901 off,
          # radon/xenon cover complexity.
          - id: ruff-check
          # Formats Python files. Stops the commit once when it changes a file.
          - id: ruff-format
            types_or: [python, pyi]
      - repo: local
        hooks:
          # Advisory: lists functions of rank C or worse (complexity >= 11).
          # Ranks: A 1-5, B 6-10, C 11-20, D 21-30, E 31-40, F 41+.
          - id: radon-cc
            name: radon-cc (complexity, advisory)
            entry: radon cc --min C --show-complexity
            language: python
            additional_dependencies: [radon==6.0.1]
            types: [python]
            verbose: true
            exclude: ^(tests/|scripts/)
          # Blocking: fails the commit if any function is worse than rank C,
          # i.e. D or worse (complexity >= 21). Use --max-absolute B for a
          # stricter gate (fails at 11+); avoid A, it flags ordinary code.
          - id: xenon
            name: xenon (complexity gate, blocking)
            entry: xenon --max-absolute C
            language: python
            additional_dependencies: [xenon==0.9.3]
            types: [python]
            exclude: ^(tests/|scripts/)

Optional ty block (append to the `repo: local` hooks if the user chose it):

          # Type checking from the project venv, so project imports resolve.
          # Prod: blocks on any type error.
          # Demo: use `uv run --no-sync ty check --exit-zero` and add `verbose: true`.
          - id: ty
            name: ty (type check)
            entry: uv run --no-sync ty check
            language: system
            types: [python]
            exclude: ^(tests/|scripts/)

The JS/TS hooks are `language: system`: they run the project's own ESLint,
Prettier and tsc via `npx --no-install`, so they use the project's config and
plugins and never download anything during a commit. Demo hooks wrap the
command in `sh -c '… || true'` so they never block; on Windows, Git for
Windows provides `sh` to the hooks. Write the ESLint rule without spaces
(`complexity:[warn,10]`): with a space after the colon the YAML doesn't parse.

JS/TS demo block (advisory):

      - repo: local
        hooks:
          # Advisory: lists lint findings and functions with complexity >= 11,
          # never blocks. Rules: eslint.config.*; the limit is set here.
          - id: eslint
            name: eslint (lint + complexity, advisory)
            entry: sh -c 'npx --no-install eslint --no-warn-ignored --rule "complexity:[warn,10]" "$@" || true' --
            language: system
            types_or: [javascript, jsx, ts, tsx]
            verbose: true
          # Formats JS/TS files. Stops the commit once when it changes a file.
          - id: prettier
            name: prettier (format)
            entry: npx --no-install prettier --write --ignore-unknown
            language: system
            types_or: [javascript, jsx, ts, tsx]

JS/TS prod block (blocking):

      - repo: local
        hooks:
          # Blocking: fails on any lint error and on any function with
          # complexity >= 21 (the same gate as xenon). Use complexity:[error,10]
          # for a stricter gate. Rules: eslint.config.*; the limit is set here.
          - id: eslint
            name: eslint (lint + complexity, blocking)
            entry: npx --no-install eslint --no-warn-ignored --rule "complexity:[error,20]"
            language: system
            types_or: [javascript, jsx, ts, tsx]
          # Formats JS/TS files. Stops the commit once when it changes a file.
          - id: prettier
            name: prettier (format)
            entry: npx --no-install prettier --write --ignore-unknown
            language: system
            types_or: [javascript, jsx, ts, tsx]

Optional tsc block (append to the JS/TS `repo: local` hooks if the user chose
it):

          # Type checks the whole project (tsconfig.json), not only staged files.
          # Prod: blocks on any type error.
          # Demo: use  entry: sh -c 'npx --no-install tsc --noEmit || true'  and add verbose: true.
          - id: tsc
            name: tsc (type check)
            entry: npx --no-install tsc --noEmit
            language: system
            types_or: [ts, tsx]
            pass_filenames: false

ESLint config (`eslint.config.mjs`, only if the project has none). For plain
JS, drop the `typescript-eslint` import and its line:

    import { defineConfig, globalIgnores } from 'eslint/config';
    import js from '@eslint/js';
    import tseslint from 'typescript-eslint';
    import globals from 'globals';

    export default defineConfig(
      globalIgnores(['dist/', 'build/', 'coverage/']),
      js.configs.recommended,
      tseslint.configs.recommended,
      { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    );

To switch a repo from demo to prod later, rerun `/agentic-kit-setup`: Step 2
changes the repo type, Steps 3 to 5 update the CLAUDE.md block, the settings
and these hooks. By hand: change `INVENT_REPO_TYPE`, add `xenon`, drop the
`--exit-zero` flags and the `sh -c '… || true'` wrappers, and change the
ESLint rule to `complexity:[error,20]`.

## Step 6 — Statusline and notification (personal, optional)

Both are personal preferences, so they go into the user's own
`~/.claude/settings.json`, not the project.

First check what is already there, before asking anything:

- Read `~/.claude/settings.json`. The statusline counts as set up if
  `statusLine.command` runs `invent-kit/statusline.js`; the notification if
  a `hooks.Stop` entry runs `invent-kit/notify.js`.
- For each one that is set up, compare `~/.claude/invent-kit/<script>` with
  `${CLAUDE_SKILL_DIR}/../../extras/<script>`, ignoring line endings
  (e.g. `git diff --no-index --ignore-cr-at-eol --quiet <a> <b>`).

Then:

- **Both set up, scripts current:** tell the user, skip to Step 7.
- **Set up, script outdated or missing:** ask whether to update the copy
  in `~/.claude/invent-kit/` to this kit version. Settings stay unchanged.
- **Not set up:** ask via AskUserQuestion (multiSelect) only about the
  ones that are missing; skip the rest of this step if they pick neither:

- **Statusline** — two lines under the prompt:
  `[Opus]  effort:medium  ctx:23%/1000k  $0.41  today:~$12.34  +120/-45  5h:37%`
  and `(main*)  ~/code/my-repo`. `today:~$` is an estimate at API list prices,
  not the bill on a subscription; `5h` only shows on Pro/Max subscriptions.
- **Notification** — a desktop notification "Claude finished in <project> -
  your turn" whenever Claude stops. Useful with several sessions in parallel;
  noisy if you watch Claude work anyway.

1. Copy the chosen scripts from `${CLAUDE_SKILL_DIR}/../../extras/` (`statusline.js`,
   `notify.js`) to `~/.claude/invent-kit/`. They are copied because the plugin
   folder moves on every update. Only copy what the user agreed to above.
2. Read `~/.claude/settings.json` (create it with `{}` if missing) and show the
   exact change before writing it. Use the absolute home path with forward
   slashes (`C:/Users/<you>/...` on Windows), since the command may run in Git
   Bash, which drops backslashes.
   - **Statusline:** set
     `"statusLine": { "type": "command", "command": "node <home>/.claude/invent-kit/statusline.js" }`.
     If a different `statusLine` is already set, show it and ask before replacing it.
   - **Notification:** add to `hooks.Stop` (keep every existing hook, don't
     add it twice):
     `{ "hooks": [ { "type": "command", "command": "node <home>/.claude/invent-kit/notify.js" } ] }`.
3. Tell the user it takes effect after restarting Claude Code. On Windows, the
   first notification may need notifications for "Windows PowerShell" allowed
   under Settings → System → Notifications; on macOS, for "Script Editor".
   Linux needs `notify-send` (package `libnotify-bin`).

## Step 7 — Restructure (repo-setup)

`repo-setup` checks the repo's `CLAUDE.md` and `.claude/` against Anthropic's
guidance and moves instructions into rules, skills, hooks or permissions. It
leaves the Invent block alone.

1. Tell the user that it now runs without questions: it lists its findings,
   takes a second backup next to the one from Step 0, and applies all of
   them. The skill itself asks nothing; Claude Code may still ask to allow
   each file change, depending on the permission mode.
2. Invoke the `repo-setup` skill with the Skill tool and the arguments
   `--no-questions`.
3. If the user declined something in Steps 1–6 (the Invent block, a
   `CLAUDE.md`, deny rules), skip any repo-setup finding that would create
   or add it after all, and name it in Step 8. `--no-questions` applies only
   to repo-setup's own findings, not to what the user already turned down.

## Step 8 — Done

Confirm all files are in the desired state and summarize what changed. Give
both restore commands. The one from Step 7 undoes only the restructuring.
The one from Step 0 puts back every file that existed before this setup, as
it was then. Files this setup created (a new `CLAUDE.md`, `.claude/settings.json`,
`.pre-commit-config.yaml`, rules and skills from Step 7) stay in place, and so
do changes to `.gitignore` and to `~/.claude`; delete or revert those by hand
if needed. The backup folder can be deleted once the user is happy.

Then point to Claude Code's built-in checks for tidying up the instruction
files later. Both only propose changes and edit nothing without the user's OK:

- `/doctor` — trims `CLAUDE.md` of what Claude can read from the code itself
  (directory layouts, dependency lists, architecture overviews).
- `/doctor prompt-audit` — finds outdated, contradicting or broken
  instructions across `CLAUDE.md`, rules, skills and agents.
