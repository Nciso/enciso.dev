---
title: Making security decisions legible to a non-technical exec
description: A framework for running a risk-based security and infrastructure engagement when the person paying for it doesn't speak the technical language.
tags:
  - security
  - consulting
  - infrastructure
  - framework
order: 7
---

Some of the work I do under Jaro isn't building products — it's helping small
companies that grew faster than their infrastructure get their security in order.
A recurring version: a firm of around forty people, no in-house IT, one person who
became the de-facto systems admin by accident, and an executive who knows
something needs to happen but can't evaluate a technical proposal.

The hard part is never the technical diagnosis. The hard part is turning that
diagnosis into decisions a non-technical decision-maker can actually own. This is
the framework I settled on.

## Two layers, two audiences

I keep the work in two separate layers, and never mix them in a meeting.

| | The executive sees | How I work internally |
| --- | --- | --- |
| **Organization** | A handful of themes in plain language | A dozen-plus technical risk vectors |
| **Language** | "Payments," "Devices," "Messaging" | Identity, MDM, EDR, backups, DNS… |
| **Purpose** | Make a decision | Execute and track |
| **Format** | Risks + options + cost | Diagnosis + tasks + deliverables |

The vectors are my tooling. The executive never sees them — they'd drown. They see
three or four themes, each one a decision they're equipped to make. Behind each
theme, several technical vectors feed in; a single control often covers a risk
that shows up in two different themes.

## Risk in the client's own words

The most important column in any risk table isn't the risk — it's how the *client*
would phrase it. Not "unmanaged endpoints with no remote-wipe capability," but:

> "Someone loses a laptop and we can't erase it."

Not "lack of an offboarding process for privileged access," but:

> "Somebody leaves and can still get into everything."

If I can't write the risk the way the decision-maker would say it out loud, I don't
understand it well enough yet. That sentence is also what makes them care — they're
not buying a control, they're closing a scenario that keeps them up at night.

## Solutions as a stacked menu, not a wall of options

For each theme I present three solutions, and they **stack** — each one contains
the one before it:

- **S1 — Minimal.** Closes the one or two risks that are unacceptable at any price.
  Often costs nothing but process and discipline.
- **S2 — Recommended.** Closes most of the theme with the least moving parts.
- **S3 — Complete.** Closes everything, usually by adding cost or vendor complexity.

The decision-maker isn't choosing between disconnected options — they're choosing
*how far to go*. Every solution carries three things: which risks it covers, how
long it takes, and what it costs. So they can say either:

> "Option 2 covers A and B. I can live with C being open. Going with 2."

or

> "C is the one that scares me. I'll pay for 3."

Both are good outcomes, because both are *informed* and *theirs*. My job is to make
the trade-off legible, not to make the choice.

## The coverage matrix

One small table does a disproportionate amount of work — risks across the top,
solutions down the side, an ✕ where a solution closes a risk:

| | R1 | R2 | R3 | R4 |
| --- | --- | --- | --- | --- |
| S1 | ✕ | | | |
| S2 | ✕ | ✕ | | ✕ |
| S3 | ✕ | ✕ | ✕ | ✕ |

The moment an executive sees this, the abstract becomes concrete. They can see
exactly what they're accepting by choosing a cheaper tier — and "accepted risk"
becomes an explicit, documented decision instead of a silent gap.

## From framework to proposal

The framework above is for *planning* — it's how I decide what to bring to the
table. What the client actually reads is a proposal document per work-stream, and
that has a different shape:

1. **How it works today** — the current state in plain language, and why it's risky.
2. **What can go wrong** — the risk table.
3. **What I propose** — walk each piece of the solution: the concept, who does
   what, the day-to-day flow, and — critically — what I left *out* and why.
4. **What this covers** — each risk mapped to how the proposal closes it.
5. **What happens if…** — the scenarios play out, showing the system handles them.
6. **Cost and dependencies** — honest about what the timeline actually depends on.

A few rules I hold to on these documents:

- **A recommendation beats a menu.** The S1/S2/S3 menu is a planning tool. If I
  already have a clear recommendation, I give it — I don't manufacture false choice.
- **Cut redundant controls.** If one control makes another unnecessary, the second
  one comes out. Stacked controls read as padding.
- **No fake timelines.** I don't invent week counts; I say what the timeline
  genuinely depends on, including third parties I don't control.
- **No processes nobody will maintain.** A logbook that won't get filled in is
  worse than no logbook — it manufactures false confidence.

## Cadence

The engagement runs on a weekly rhythm against a small fixed number of hours: prep
one or two themes, present them in a short standing meeting, record what the
decision-maker chose and which risks they explicitly accepted, then spend the rest
of the week executing the vectors behind whatever got approved. Decisions live in a
shared doc the client owns; the technical research and half-formed questions stay in
my own notes.

## Why it works

The instinct in this kind of work is to lead with the technical findings — to prove
you did the diagnosis. But a list of vulnerabilities handed to someone who can't
rank them produces either paralysis or a rubber-stamp. Reframing every finding as a
plain-language risk, bundling risks into stacked solutions with real costs, and
making the coverage explicit turns an overwhelming technical problem into a short
sequence of decisions the person paying for it can confidently make and own.

That ownership is the whole point. When the executive can say *why* they chose a
tier and *what* they knowingly left open, security stops being something done *to*
the company and becomes something the company decided.
