# SWTOR_Prog Independent Development and Runtime Integration Rules

## Purpose

This document defines the intended relationship between the SWTOR_Prog project and the guild operations project.

SWTOR_Prog is being developed as an independent progression and parsing platform. The guild operations project is being developed as an independent guild operations platform.

The two projects are separate codebases with separate responsibilities and separate lifecycles.

## Core Rule

Each project must remain independently usable and independently deployable:

- SWTOR_Prog must function as a progression and parsing system without the guild operations app
- the guild operations project must function as a guild operations platform without SWTOR_Prog

Both projects must support installation on multiple Discord servers and be built around guild tenancy.

## Multi-Guild Requirement

Both projects are multi-tenant by design.

Each Discord guild/server is a separate tenant with its own:

- guild configuration
- member records
- permissions and roles
- progression context
- visibility rules
- bot settings

No guild should implicitly share data with another guild.

## Runtime Cooperation

When both projects are running together, they may exchange structured data through a minimal, explicit integration contract.

This runtime coupling is intentional but optional.

The integration contract must support:

- progression event sharing
- normalized encounter summaries
- member or guild-level analytics export
- privacy-aware cross-guild comparisons

## Constraint

SWTOR_Prog must not be treated as a required dependency for the guild operations app, and the guild operations app must not be treated as a required dependency for SWTOR_Prog.

Both projects must treat the active guild ID as a first-class runtime dimension rather than as a single global application setting.

## Architectural Boundary

SWTOR_Prog owns parsing, progression analysis, and combat-derived analytics.

The guild operations app owns guild coordination, rostering, attendance, officer tools, and Discord workflow.

They should communicate only through agreed input/output contracts and not through implementation-level reuse.

## Privacy and Scope Rules

- raw personal progression data remains owned by the member or guild that created it
- cross-guild visibility is controlled only through explicit rules
- public comparisons must be opt-in and restricted to approved scopes
- no project should assume access to the other project's internal data structures
- cross-guild comparison data must be aggregated and filtered, never raw unrestricted exports

## Contract Expectations

The runtime connection should be:

- versioned
- narrow
- documented
- permission-aware
- safe when the other service is offline
- compatible with multi-guild deployments

## Goal

The intended relationship is:

- independent development
- optional runtime collaboration
- shared integration contract only
- no hard dependency or cross-codebase coupling
- multi-guild-safe architecture

This makes both projects easier to evolve, easier to deploy independently, and safer to operate in the long term.
