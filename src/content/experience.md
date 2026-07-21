---
title: Experience
description: Enrique's engineering career — from Ruby on Rails and infrastructure to AI-native products — plus the roles, technologies, and companies behind it.
tags:
  - experience
  - skills
  - technologies
  - AI agents
  - career
  - infrastructure
  - fintech
  - leadership
  - certifications
  - MIT
order: 2
---

## Summary

I'm a software engineer with more than a decade of experience, currently CTO at
**Reley**. My path runs from Ruby on Rails and infrastructure-as-code, through
fintech compliance and platform engineering, to the AI-native work I focus on
today. I've been a founder, a CTO, a technical lead, and an individual
contributor — usually the person who sets up the foundations and then helps a
team build on top of them.

## What I focus on now

I work primarily on AI-native applications: retrieval systems, agent workflows,
and the tooling that makes them shippable. The last stretch of my career has
been about making language models genuinely useful without making them expensive
or unsafe.

## Experience with AI agents

I build agents that plan, call tools, and stay grounded in real data instead of
guessing. That means:

- Designing retrieval pipelines so a model only ever sees relevant context.
- Adding tool-calling loops — `search()`, `read()`, `list()` — so an agent can
  gather what it needs instead of relying on one shot of context.
- Enforcing "only answer from supplied context, cite sources, admit when you
  don't know" as a hard constraint rather than a hope.
- Running small models locally (in-browser via WebLLM) when privacy and cost
  matter more than raw capability.

## Technologies I use

- **Languages:** TypeScript, JavaScript, Go, Ruby, Python.
- **AI / retrieval:** WebLLM, MiniSearch, embeddings, RAG pipelines,
  tool-calling agents.
- **Infrastructure:** Terraform (including a custom provider), AWS, Docker,
  CI/CD, serverless, Heroku, Infrastructure as Code.
- **Backend:** Ruby on Rails, REST APIs, PostgreSQL, document-oriented
  databases, multitenancy.
- **Frontend:** React, Astro, Vue / NativeScript, JAMstack.
- **Security & compliance:** SCIM/SSO, SOC 2, HIPAA, PCI DSS, data governance.

## Certifications

- **Applied Data Science Program: Leveraging AI for Effective Decision-Making** —
  MIT Professional Education (Jan – Apr 2024). ·
  [Verify](https://credentials.professional.mit.edu/5de6e5eb-c371-449a-a62b-8ccfb7735200)
- **Generative AI for Natural Language Processing** — Great Learning (2025). ·
  [Verify](https://www.mygreatlearning.com/certificate/XGZDCEDS)

## Roles

### Chief Technology Officer — Reley (Apr 2024 – present)

I lead engineering at Reley, building a platform that gives businesses an
AI-readable and verifiable identity. See the [Reley](/projects/reley) page for
what the product does and why I'm building it.

### Software Engineer — AutoCloud (Aug 2021 – Apr 2024)

Built a custom **Terraform provider** in Go, enabling Infrastructure-as-Code
teams to leverage existing modules and deploy infrastructure in a controlled,
efficient, compliant way. Spearheaded the design of an infrastructure-management
product tailored to infrastructure teams, led the integration of **SCIM and
SSO** to strengthen authentication and identity, and ran training sessions and
documentation to drive adoption. Core stack: Go, Terraform.

### Technical Lead & Software Engineer — Flourish (Sep 2020 – Aug 2021)

Led the tech team maintaining B2C clients while shipping the first B2B client on
schedule within the first three months of production. Designed the foundation of
**multitenancy** for different bank customers using Docker, Rails engines,
PostgreSQL schemas, design systems, and Terraform modules. Earlier, as a software
engineer, I laid the B2B infrastructure on AWS with Terraform and CI/CD, and
migrated a full backend from Heroku to AWS without losing performance while
improving the security and compliance that bank customers required.

### Technical Lead — Digita Studio (Jan 2019 – Sep 2020)

At a remote software consultancy focused on strategic design, we validated client
business models quickly on no-code/low-code platforms, then — once clients hit
their first ROI — migrated their products to modern front-end technologies and
serverless to consolidate and scale. Core stack: TypeScript.

### Information Technology Advisor — ECcomplianceMX (Jun 2019 – Jun 2020)

Advised Mexican fintech startups on regulation (partially based on SOC 2 and
HIPAA), helping create and implement compliance practices: business impact
analysis, business continuity plans, data and information security manuals, and
privacy / sensitive-data management.

### Chief Technology Officer — Waicount (Sep 2017 – Nov 2018)

Built an automated accounting service for freelancers and small business owners.
Waicount pulled the user's invoicing information automatically and calculated
their income and transaction taxes based on their activity — no human accountant
required.

### Earlier roles

- **Frontend Developer — MUCvibes (2017):** Built a JAMstack magazine site for
  expats in Munich (Netlify + Contentful headless CMS), designed so non-developers
  could manage content without engineering help.
- **Freelance Software Engineer — FMS Ingeniería (2017):** Built a small ERP for
  a construction company to manage acquisition and future estimation — where I
  first learned to run ETL over large data files into SQL and document databases.
- **Frontend Developer — Flourish (2017):** Built the first version of the app in
  NativeScript with Vue.
- **Founder Developer — Gamers Mutual (2015 – 2016):** An investment service built
  around video games. Defined and maintained the REST APIs game developers used to
  publish, learned financial-industry regulation (PCI DSS, data governance), and
  led a product team building infrastructure with 12-factor practices and CI/CD.
- **Software Engineer (Internship) — R.U.T.A (2014):** A private statistics
  service where NGOs studied the Mexican immigration phenomenon; built data
  visualizations with D3.js.
- **Mexico Executive Producer — Hack for Big Choices (2013 – 2014):** Co-organized
  the first HackForBigChoices hackathon in the world.
- **Junior Web Developer (Internship) — Foodstamp (2013):** A food-photo platform;
  built an MVC app in Ruby on Rails following 12-factor and deployed it on Heroku.
- **Robotics Teacher — Tecnológico de Monterrey (2013):** Taught children the
  basics of robotics with Lego Mindstorms.

## How I like to work

I prefer small, verifiable steps and infrastructure that doesn't page me at
night. I lean on build-time generation, static output, and client-side
computation to keep systems cheap, private, and durable — the same philosophy
behind this site.
