# MedicalRecords.UnitTests — Unit Test Suite for Medical Records Domain

## Overview
Unit tests for MedicalRecords domain entities, value objects, aggregate invariants, and CQRS command/query handlers. No database or network required.

## Current Status
**⚠️ Empty** — the project skeleton exists (`.csproj` compiles) but contains no test files yet. This is a known gap. Tests should be added alongside any MedicalRecords domain changes.

## Intended Coverage (when tests are written)
| Area | What to test |
|------|-------------|
| `MedicalRecord` aggregate | State transitions, invariant enforcement, domain event raising |
| Value objects | VitalSigns ranges, Prescription status, DiagnosisCode format |
| Command handlers | Happy path + validation failures via MediatR |
| Query handlers | Filtering, pagination, IDOR checks |

## Stack
- xUnit, NSubstitute, FluentAssertions, Bogus

## Run Command
```bash
dotnet test tests/MedicalRecords.UnitTests --filter "FullyQualifiedName~MedicalRecords.UnitTests"
```
