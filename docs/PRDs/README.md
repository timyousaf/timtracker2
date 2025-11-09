# Product Requirements Documents (PRDs)

This directory contains Product Requirements Documents that document features, changes, and architectural decisions made in the TimTracker2 project.

## Purpose

PRDs serve as:
- **Historical Record**: Track what was built, when, and why
- **Decision Documentation**: Capture rationale for technical and product decisions
- **Context for AI**: Help Cursor and other AI tools understand the project's evolution
- **Onboarding**: Help new team members understand the codebase

## Naming Convention

PRDs are named with a number prefix and descriptive name:
- `0001-feature-name.md`
- `0002-another-feature.md`
- etc.

The number helps maintain chronological order and makes referencing easier.

## When to Create a PRD

Create a PRD when:
- Adding a new major feature
- Making significant architectural changes
- Implementing complex functionality
- Making important design decisions that affect the codebase
- Changing authentication or security patterns
- Adding new integrations or services

You don't need a PRD for:
- Bug fixes
- Minor UI tweaks
- Simple refactoring
- Documentation updates

## Template

Use `TEMPLATE.md` as a starting point for new PRDs. Copy it and fill in the relevant sections.

## Status Values

- **Draft**: Initial planning, not yet implemented
- **In Progress**: Currently being implemented
- **Completed**: Feature is done and deployed
- **Deprecated**: Feature was removed or replaced

## Best Practices

1. **Write PRDs before coding** (when possible) - helps clarify requirements
2. **Update as you go** - document decisions as you make them
3. **Be specific** - include technical details and rationale
4. **Link related PRDs** - reference other documents when relevant
5. **Keep them updated** - update status and changelog as work progresses

## Example PRDs

- `0001-initial-clerk-setup.md` - Example of a completed PRD for the initial authentication setup

