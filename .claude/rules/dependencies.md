---
paths:
  - "**/*.csproj"
  - "**/package.json"
  - "Directory.Packages.props"
---

# Dependency Rules

## Selection
1. **Check license first** — prefer MIT, Apache 2.0, BSD, ISC, MPL 2.0
2. **If paid is the only option** — stop and discuss with user before adding
3. **Never silently add commercially-licensed packages**
4. **Stable versions only** — never preview, alpha, beta, RC, nightly

## Evaluation
- Actively maintained? (last commit < 6 months)
- Does it duplicate something already in the project?
- Is it the simplest tool for the job? (KISS/YAGNI)

## Approved Paid Dependencies
| Package | License | Status |
|---------|---------|--------|
| Duende IdentityServer | Commercial (free < $1M) | In use |
