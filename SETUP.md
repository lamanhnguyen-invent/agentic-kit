# Install invent-agentic-kit without the plugin marketplace

Instructions for Claude. The user starts Claude Code in the project they
want to set up and asks: "Follow `<path to this folder>/SETUP.md`".

The kit is built as a Claude Code plugin, but plugin marketplaces are hard to
use at Invent. This file installs the same pieces as plain files in the
user's personal `~/.claude/` folder, where Claude Code finds them without a
plugin, and then starts `/agentic-kit-setup` for the current project. Run it
once per machine, and again to update the kit. After that, every other
project only needs `/agentic-kit-setup`.

`<kit>` below is the folder this file is in, and `<home>` is the user's home
folder with forward slashes (`C:/Users/<you>` on Windows), since hook
commands may run in Git Bash, which drops backslashes. Ask the user one
question at a time via AskUserQuestion.

## Step 1: Check Node and the plugin

1. Run `node --version`. The kit's hooks are Node scripts; without Node 18
   or newer they fail silently. If it is missing or older, tell the user to
   install it from the pre-approved software in the Company Portal (an older
   version first has to be uninstalled there), restart Claude Code and start
   again, and stop.
2. Read `~/.claude/settings.json`. If `enabledPlugins` has an
   `invent-agentic-kit@…` entry set to `true`, the plugin is installed:
   with the copies as well, every hook would run twice. Tell the user to
   remove it first with `/plugin uninstall invent-agentic-kit@invent-agentic-kit`,
   then start again, and stop.

## Step 2: Copy the files

Copy these from `<kit>` into `~/.claude/`, keeping the folder structure.
Leave out every `tests/` folder.

| From `<kit>` | To `~/.claude/` | Why |
|---|---|---|
| `skills/*/` (all six skill folders, with their files and `scripts/`) | `skills/` | `/agentic-kit-setup`, `/grill-with-docs`, `grilling`, `domain-modeling`, `ponytail`, `repo-setup` |
| `agents/pr-review.md` | `agents/` | the review agent |
| `hooks/<name>/<name>.js` for `protect-secrets`, `block-dangerous-commands`, `git-safety`, `ponytail-activate`, `format` | `hooks/<name>/` | the hook scripts; `ponytail-activate` reads `~/.claude/skills/ponytail/SKILL.md` |
| `extras/statusline.js`, `extras/notify.js` | `extras/` | `/agentic-kit-setup` Step 6 copies them from here if the user wants them |

Don't copy `.claude-plugin/`, `hooks/hooks.json`, `plans/`, the docs or any
cache folders: they only matter for the plugin or for developing the kit.

Before copying, check each target:

- **Missing:** copy it.
- **Identical** (ignoring line endings, e.g. `git diff --no-index
  --ignore-cr-at-eol --quiet <a> <b>`): skip it.
- **Different:** the user has their own skill of that name (common for
  `grilling`, `grill-with-docs` and `ponytail`) or an older kit version.
  List all differing targets in one AskUserQuestion (multiSelect) and
  replace only the ones the user picks. Move each replaced file or folder
  to `~/.claude/invent-kit/backup/<timestamp>/` first, not next to the
  original, where Claude Code would still load it as a skill.

## Step 3: Register the hooks (~/.claude/settings.json)

A plugin registers its hooks through `hooks/hooks.json`; plain copies need
them in `~/.claude/settings.json`.

1. Take the `hooks` object from `<kit>/hooks/hooks.json` and replace
   `${CLAUDE_PLUGIN_ROOT}/hooks/` in every command with
   `<home>/.claude/hooks/`, e.g.
   `node "C:/Users/<you>/.claude/hooks/git-safety/git-safety.js"`. Keep
   every matcher and timeout.
2. Merge it into `~/.claude/settings.json` (create the file with `{}` if
   missing): keep every existing key and hook. An entry whose command
   already runs `.claude/hooks/<name>/<name>.js` is the kit's: update its
   path instead of adding it again.
3. Show the exact change and ask before writing it. Copy the old file to
   `~/.claude/invent-kit/backup/<timestamp>/settings.json` first.

## Step 4: Start /agentic-kit-setup

Summarize what was copied, skipped and replaced, and where the backup is.
Tell the user that the hooks and the `pr-review` agent take effect after
Claude Code restarts.

Then invoke the `agentic-kit-setup` skill with the Skill tool for the
current project. It doesn't need the hooks to be active. If the skill isn't
available yet in this session, tell the user to restart Claude Code in the
project and type `/agentic-kit-setup`.

To update later, pull the new kit version and follow this file again: Step
2 offers to replace the files that changed.
