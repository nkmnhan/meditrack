---
paths:
  - "**/*"
---

# Project Index — Read Before Exploring

> **Token-saving rule**: Check these registries BEFORE using Glob/Grep to explore the codebase.

## Quick Lookup

| Need to find... | Check first |
|----------------|-------------|
| A backend file's purpose | `.claude/index/backend-registry.json` |
| An existing component/hook/util | `.claude/index/frontend-registry.json` |
| A service's domain model | Per-service `CLAUDE.md` (e.g., `src/Clara.API/CLAUDE.md`) |
| A frontend feature's structure | `src/MediTrack.Web/CLAUDE.md` |
| API endpoints for a feature | `frontend-registry.json` → `featureApis` section |
| UI primitives (shadcn) | `frontend-registry.json` → `uiPrimitives` array |

## Before Creating New Code

1. **New component?** → Check `frontend-registry.json` → `sharedComponents` + `uiPrimitives`
2. **New hook?** → Check `frontend-registry.json` → `sharedHooks` + `featureHooks`
3. **New util?** → Check `frontend-registry.json` → `sharedUtils`
4. **New API call?** → Check `frontend-registry.json` ��� `featureApis` for existing RTK Query endpoints
5. **New backend service?** → Check `backend-registry.json` for existing services in that domain

## Updating the Index

When you create new shared components, hooks, utils, or backend services:
- Update the relevant `.claude/index/*.json` file
- Keep entries as `"Name": "one-line purpose"` — no long descriptions
