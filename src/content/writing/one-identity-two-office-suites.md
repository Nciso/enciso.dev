---
title: One identity for two office suites
description: How to run Microsoft 365 and Google Workspace side by side under a single Entra ID login — no forced migration, one MFA, one off-switch.
tags:
  - identity
  - microsoft-365
  - google-workspace
  - infrastructure
order: 8
---

A company I worked with was split down the middle. Half had grown up on Google
Workspace and lived in Gmail and Drive. A newer cohort had landed on Microsoft
365 and wanted Outlook and Teams. The mandate I was handed was the usual one:
"pick one, migrate everyone, cancel the other."

I pushed back, and we did something better — we let both stay, under a single
identity. The result is calmer than a migration and, in some ways, stronger than
standardizing. Here's the architecture.

## The reframe: don't migrate, unify identity

The instinct to consolidate suites is really two wishes wearing one coat:

1. **One way in and one way out** — a single login, a single MFA, and one switch
   that cuts *all* access when someone leaves.
2. **One set of tools** — so everyone's in the same inbox and calendar.

Only the first wish actually matters for security and operations. The second is
mostly a preference, and forcing it is where migrations get expensive — months of
cutover, retraining, and adoption risk, all to take tools *away* from people who
liked them.

So I split the wishes. **Consolidate identity; let the suites coexist.** One
identity provider sits in front of both. Everyone authenticates through it, MFAs
through it, and gets deprovisioned through it — but they keep whichever inbox,
drive, and calendar they already prefer.

## The shape

```
                 Entra ID  (the one identity provider)
                     │
   ┌─────────────────┼──────────────────┐
   │                 │                  │
Microsoft 365    Google Workspace     SaaS apps
(native)         (federated, SAML)    (SSO via Entra)
 Outlook/Teams    Gmail / Drive        every app points
 OneDrive         Google Calendar      at one IdP
 Intune (MDM)
 Defender (EDR)

Offboarding: disable the Entra ID account
             → loses Microsoft 365, Google, and every SaaS app at once
             → Intune wipes/locks the device
```

Microsoft 365 is native to Entra ID. Google Workspace is *federated* to it over
SAML — so Google stops handling authentication and instead trusts a signed
assertion from Entra that says "this person is who they say they are." Every SaaS
app repoints its SSO at the same identity provider.

## 1. Federate Google Workspace to Entra ID

The load-bearing move. Google delegates sign-in to Entra over SAML, and Entra
provisions Google accounts over SCIM.

- **No Google upgrade required.** The standard business tier already supports SAML
  SSO with an external IdP and SCIM provisioning. The features that *do* need a
  higher Google tier (context-aware access, advanced endpoint management) are the
  ones Entra ID + Intune are already covering, so you don't buy them twice.
- **On the Entra side:** register Google Workspace as an enterprise application,
  configure SAML (entity ID `google.com`, reply URL `accounts.google.com/samlrsp`),
  map the user's UPN to their email, and export the signing certificate and the
  login/logout URLs.
- **On the Google side:** Admin Console → Security → set up SSO with a third-party
  IdP, paste in Entra's login/logout URLs, and upload Entra's certificate.
- **Provisioning (SCIM):** turn on automatic provisioning from the Google
  enterprise app in Entra. Now creating a user in Entra creates their Google
  account; disabling in Entra disables Google. One place to manage the lifecycle.

Verification is satisfying: a user goes to `gmail.com`, Google sees the domain is
federated, bounces them to the Entra login screen, and returns them to Gmail
signed in.

## 2. One MFA, not two

This is the quiet win people feel immediately. Before, anyone with accounts in
both worlds juggled *two* second factors — a Google prompt and an authenticator
app. After federation, **Google never sees credentials.** It receives a SAML token
from Entra that already asserts the user was verified, so Google's own 2FA prompt
simply stops appearing.

What replaces it is a single Entra MFA — one authenticator app, one "approve and
enter this number" prompt — whether the person is opening Outlook or Gmail. The
old Google 2FA config doesn't need to be dismantled; it just goes dormant.

## 3. What login feels like

- **Going to Microsoft** (`office.com`): type your address → Entra login →
  password + MFA → you're in.
- **Going to Google** (`gmail.com`): type the *same* address → Google sees the
  domain is federated → redirects to the *same* Entra screen → password + MFA →
  back to Gmail.
- **Already signed in somewhere:** open a Gmail tab with a live Microsoft session
  and Entra hands you straight to Google with no prompt. From the user's chair,
  they typed `gmail.com` and it opened.

The whole thing they need to be told is one sentence: *"Same username and password
everywhere. office.com for Microsoft, gmail.com for Google. You'll only be asked to
log in once."* You can even drop a Google Workspace tile into the Microsoft 365 app
launcher so both live in one portal.

## 4. Mail: same domain, user picks the mailbox

Everyone is `you@example.com` to the outside world, regardless of where their
mailbox physically lives.

- MX points at Exchange Online (Entra is the IdP, so Microsoft owns primary
  routing).
- Users who chose **Outlook** get delivered normally.
- Users who chose **Gmail** get a transport rule / mail-flow connector in Exchange
  Online that forwards their mail to Google Workspace.

Outside senders neither know nor care which one you use — the mail just lands.
Internal cross-platform mail (a Gmail user emailing an Outlook user) is ordinary
SMTP; it works with zero special config, exactly like emailing any external
address that happens to share your domain.

DNS is the one place you have to be careful, because both providers sign your mail:

```dns
; MX to Exchange Online
example.com.  MX  0  example-com.mail.protection.outlook.com.

; SPF authorizes BOTH providers
example.com.  TXT  "v=spf1 include:spf.protection.outlook.com include:_spf.google.com ~all"

; DKIM for both — different selectors, so they don't collide
; Microsoft:  selector1._domainkey.example.com  → CNAME to M365
; Google:     google._domainkey.example.com     → Google's TXT/CNAME
```

Switching someone from Gmail to Outlook later is a transport-rule edit and an
optional history migration — zero downtime, invisible to everyone else.

## 5. Calendar: cross-platform free/busy

Meeting *invites* between Google Calendar and Outlook already work — they ride on
iCal, which is universal. What breaks without extra setup is seeing someone's
availability on the *other* platform before you send the invite; the scheduling
view just shows "no information."

Calendar Interop fixes that, in each direction independently:

- **Google → Outlook availability:** create an Entra app registration with
  `Calendars.Read` on Microsoft Graph, then enter its credentials in Google Admin →
  Calendar → Calendar Interop. Google now queries Graph for free/busy.
- **Outlook → Google availability:** Calendar Interop exposes an availability
  endpoint; create an Organization Relationship in Exchange Online pointing at it.
  Exchange now queries Google for free/busy.

This isn't day-one critical — wire it up after federation and mail routing are
stable. It's an experience upgrade, not a blocker.

## 6. Files: this one's free

Drive ↔ OneDrive/SharePoint interop needs no configuration. Share links are just
URLs, and every user has an account in *both* worlds (native in Microsoft,
federated in Google), so whoever opens a link can authenticate. A Drive link
opened by a OneDrive user authenticates against Entra — which Google already
trusts — and the file opens. It's standard web plus SSO.

The only real decision is where the *company's shared* files live (SharePoint or a
shared Drive), and that can wait.

## The payoff: one off-switch

The reason this is worth doing isn't the coexistence for its own sake — it's what
collapses onto a single control plane:

- **Offboarding is one action.** Disable the Entra account and the person loses
  Microsoft 365, Google Workspace, the password manager, and every SaaS app at
  once. Intune wipes or locks the laptop in the same motion. There's no checklist
  of a dozen consoles to remember, which is exactly where ex-employees keep access
  they shouldn't.
- **Conditional Access covers everything.** Policies applied at Entra — require
  MFA, block risky sign-ins, require a compliant device — apply to Gmail too,
  because Gmail now authenticates *through* Entra.
- **Device management is native.** Intune and Defender for Business hang off Entra
  directly; zero-touch enrollment (Autopilot for Windows, Apple Business Manager
  for Macs) keeps working regardless of which mail suite the user picked.

And the migration you *didn't* do is the best part: no cutover, no retraining, no
adoption risk. People kept the tools they already liked, and the org got a single
front door and a single kill switch. Standardizing suites was never the real goal —
one identity was.
