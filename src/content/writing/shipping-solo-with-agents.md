---
title: Shipping solo with agents
description: How I run coding agents as a background workforce — authoring specs, approving plans from my phone, and merging finished PRs.
tags:
  - agents
  - workflow
  - AI
  - engineering
order: 6
---

As a solo founder I only have one scarce resource: judgment. Writing code, running
tests, and opening PRs is bursty work an agent can do while I'm away from the
keyboard. Deciding *what* to build and whether the result is right is work only I
can do. The system I run is designed around that split — it multiplies output by
letting me be absent during execution and fully present at the few moments where
my judgment actually matters.

## Three phases, three states of attention

Every feature moves through three gates. What changes at each is not the tool —
it's how much of me it needs.

| Phase | My attention | What's happening |
| --- | --- | --- |
| **Spec authoring** | Active, conversational | I sit with a coding agent and design the feature against real product context. Output is a spec. |
| **Plan approval** | Passive, batchable | A planner agent turns the spec into a short plan. I review it on my phone over coffee. |
| **PR review** | Medium | An executor builds it and a reviewer critiques it; a PR opens. I merge from my normal git flow. |

The whole point is that I'm designed to be *absent* during the agent runs and
*present* at the gates.

## Three agents, narrow jobs

Each agent is a separate process with a tight scope and tight failure isolation.
Different jobs get different permissions:

1. **Planner** — read-only. Reads the spec, writes a plan, exits. It is not
   allowed to write code.
2. **Executor** — full access, but only inside its own git worktree. Reads the
   plan, writes the code, opens the PR.
3. **Reviewer** — a read-only critic. Reads the spec plus the diff and writes a
   verdict: pass or fail, with comments.

Plus one that isn't really an agent:

4. **Status agent** — read-mostly. It answers "what's waiting on me?" and
   generates a morning digest. I ping it whenever I'm disoriented.

Tight scopes prevent surprise damage. The planner *can't* write code. The
executor *can't* skip the worktree. The reviewer *can't* change anything.

## The filesystem is the state

There are no daemons holding state in memory. A spec is a directory, and its
location *is* its status:

```
drafts/          → I'm still authoring
ready/           → planner picks it up
awaiting-approval/ → plan written, waiting on me
in-progress/     → I approved, executor is building
awaiting-merge/  → PR open, reviewer has signed off
blocked/         → reviewer or executor flagged a problem
done/            → merged
```

Every transition is a directory move plus a git commit. That makes the whole
system survivable, auditable, and debuggable with tools I already have. If
something breaks at 2am, it's just files — I can read exactly where each task got
stuck and why.

## A spec is a directory, not a file

This is the part that makes absence possible. A spec isn't a one-line ticket;
it's a folder holding everything the executor needs so it never has to ask me a
question mid-run: the goal and acceptance criteria, the plan, any migration
notes, a pattern to mirror, and the raw notes from the design conversation.

That last file — *why* we're building it this way, and what I rejected — is the
most valuable artifact. It captures intent, not just instructions. An agent with
intent recovers from ambiguity; an agent with only a task list guesses.

## Plans are easier to evaluate than diffs

The single highest-leverage decision in this whole setup is splitting planning
from execution. It moves my review cost from a 600-line diff to a 12-line plan.

Catching a wrong direction in a short plan costs me thirty seconds. Catching it in
a finished PR costs me the whole build. So the default place I intervene is the
plan-approval gate, on my phone, before any code exists.

## The morning digest

Once a day the status agent posts a brief to my phone:

```
# Morning Brief

## Awaiting your approval (3)
- Refresh fix — 12-line plan, low risk
- Structured-data export — 2 files, low risk
- Query N+1 — adds an index, batches the loader

## Ready to merge (1)
- Heartbeat alerts — CI green, reviewer signed off

## Blocked (1)
- Rollback missing on a migration — spec needs amendment

## In flight (2)
- Two builds ~40 min in, no issues
```

I read three plan summaries, approve or amend each with one tap, and get on with
the harder problems. The easy-to-spec work ships without me ever opening an
editor.

## When to step in — cheapest first

Intervention is a ladder, and the goal is to stay near the top:

1. **Plan-review gate** (default). Catch wrong directions in the plan, not the
   diff.
2. **Amend and retry** (the recovery I use most). Kill the run, edit the spec,
   move it back to `ready/`. Cheap against my attention.
3. **Live intervention** (rare). Attach to the running session only for
   "about to do something destructive," never for style nudges.
4. **PR-stage correction** (failsafe). Comment on the PR and run a narrow
   "address-comments" pass, or just fix it by hand.

The rule: if I find myself in a fifth situation that fits none of these, the spec
was underspecified. I capture that lesson in the executor's prompt so future runs
inherit it.

## Principles I keep coming back to

- **Filesystem is state.** No mutable state hiding in memory. Every transition is
  a move plus a commit.
- **Plans beat diffs.** Move judgment cost from PR review to plan approval.
- **Different agents, different permissions.** Read-only planners and reviewers,
  sandboxed executors. Scope is safety.
- **Specs are directories.** Enough context that the executor doesn't need me in
  the room.
- **Build the status view first.** Being oriented teaches you what to automate
  faster than automating does.
- **Don't fight the agent in real time.** Plan-review for routine catches,
  amend-and-retry for a wrong spec, PR review for a wrong result.
- **Resist sophistication until the loop runs.** Dashboards and tracing are all
  downstream of a working loop on real specs. Live with the simple version for a
  couple of weeks before adding anything.

The wedge isn't that agents write code — plenty of things write code. It's that a
disciplined loop lets one person hold the judgment while the execution runs in the
background. That's the leverage.
