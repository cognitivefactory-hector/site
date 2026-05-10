---
title: "The audit-trail moat"
slug: audit-trail-moat
mad: M
date: 2026-05-09
dek: "Why every audit Cognitive Factory survives makes the next one cheaper to win."
---

The standard advice for a customer-back moat is to own the workflow, own the data, own the integration. It assumes the customer's data has the same shape as everyone else's. In regulated manufacturing it doesn't.

The data that matters here is *audit-grade*. Redlines that survived a Nadcap subscriber. Evidence packages a DER signed off on. MRBs that closed without a CAR. NDT calls a Level III put a stamp on. None of it is scraped. None of it is licensed. It is born under stakes — under a runway, a reactor, an implant — and it can only be earned, one engagement at a time, by people the audit community already trusts.

That is the moat. Not the model. The corpus the model is graded against.

## What the engagements actually produce

Cognitive Factory ships five services. Each one of them, on every job, produces evidence as a byproduct.

- **Factory Audit** ships redlined paragraphs against a real spec.
- **Factory Yield** ships traced root causes against real scrap.
- **Factory Vision** ships defect calls against a real Level III.
- **Factory Twin** ships predicted process windows against real soak data.
- **Factory Agents** ship dispatch decisions against a real shop.

Every one of those outputs is verified before it counts. An auditor signs the redline. A quality lead closes the MRB. A Level III holds the inspection stamp. A DER agrees the twin is conservative. A scheduler watches the agent's call survive a shift change.

That verification is the asset. Each verified output is one ground-truth label that no frontier lab can manufacture, because no frontier lab is in the audit room.

## Why this is structurally a customer-back moat

The corpus is created by the customer's audit cycle, not by our engineering cycle. We do not generate this data; the regulated environment does, and we are the ones present when it lands. The pre-conditions for the moat — domain trust, working software, presence in the audit room — are the exact pre-conditions Cognitive Factory was built around.

Three properties make it a moat rather than a head start:

**It compounds.** Every engagement adds verified examples; the corpus is monotonic. A competitor entering year three has to recreate three years of audited outputs from scratch, and they can only recreate them at the rate the certification calendar allows.

**It is frontier-aligned.** Karpathy's verifiability thesis from the same Sequoia keynote — *LLMs automate what you can verify* — implies the most valuable thing on the floor is a verifier. Our corpus is exactly that. Every model jump makes the corpus more valuable, not less. A new model is a new candidate; the corpus is the gate.

**It is asymmetric to capital.** A competitor with ten times our budget cannot buy ten times the audits. Audit cadence is set by AS9100 surveillance schedules, by Nadcap reaccreditation, by FDA submissions, by DER review boards. Burn rate doesn't move them.

> A frontier lab cannot run a Nadcap audit. A SaaS competitor cannot get a DER on a Zoom call. A consulting firm without working software cannot capture the verification at the moment it happens.

## How we build it — the four-phase business move

The moat does not appear by writing code. It appears by writing the right contract, capturing the right artifact, and surviving the audit. Four phases, each scoped to a quarter, each shipping customer value first.

### Phase 1 — Capture (months 0–6)

Every service deliverable ships with a structured artifact. The schema is a one-page document inside the deliverable contract. Examples:

- Audit redlines: `(spec_paragraph, draft_text, redlined_text, reviewer_id, decision)`.
- Yield analyses: `(scrap_event, candidate_causes, validated_cause, evidence)`.
- Vision deployments: `(image_hash, model_call, level3_call, agreement)`.
- Twin runs: `(input_window, predicted_envelope, observed_outcome)`.
- Agents: `(state, action, supervisor_decision)`.

The artifacts live in a per-customer Postgres instance that the customer owns. We keep a sanitized, append-only read-replica with the customer's permission, written into the contract from day one.

### Phase 2 — Index (months 6–12)

Build the corpus layer on top of the per-customer captures. Tag each artifact by process family (heat treat, NDT, weld, plating, chem), spec lineage (AMS 2750G vs F vs E, AWS D17.1, ASTM E1444), part class, customer industry, and verifier identity. Stand up a search and slice interface so engagements can pull comparable evidence in seconds. The indexed corpus is the asset that compounds; without indexing it is a pile.

### Phase 3 — Verify (months 12–18)

Stand up an internal evaluation harness. Every model release we consider — frontier, open-weights, fine-tuned — runs against the corpus before it touches a customer floor. Disagreements between model and verifier surface immediately. They get triaged into one of three buckets: model wins (we update the verifier), verifier wins (we constrain the model), or it depends (we route to a human). The harness becomes the gate every Cognitive Factory deployment passes through.

### Phase 4 — Compound (months 18+)

Use the corpus to win the next deal. New customers get a head-start, not a head-fake: their first Audit deployment is calibrated against twelve other Nadcap subscribers' redlines; their first Vision deployment is checked against thousands of audited Level III calls; their first Yield analysis is benchmarked against verified scrap traces from comparable processes. The customer pitch shifts from *"we know this domain"* to *"we know what passing looks like in your domain, and we can show you."*

## The window

Six months in, the corpus is real, the schema is locked, two customers are contributing.

Eighteen months in, the verifier harness is gating every deployment, and no model touches a floor without passing.

Thirty-six months in, this is the most authoritative private record of regulated-manufacturing decisions in existence, and the customer pitch writes itself.

A frontier lab will not build this in the next twenty-four months. A competitor without the floor will not build it ever.

The next twenty-four months decide who runs the cognitive factories. The audit trail decides who runs them next.
