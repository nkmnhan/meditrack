# Clara.UnitTests — Unit Test Suite for Clara.API

## Overview
Unit tests for Clara.API services, domain logic, agent orchestration, SignalR hubs, and validations. No database or network required — all external dependencies are mocked with NSubstitute.

## Test Files
| File | Tests |
|------|-------|
| `Services/AgentMemoryServiceTests.cs` | Memory store, recall, cosine fallback, embedding failure |
| `Services/AgentToolsTests.cs` | Tool output format, empty results, tool registration |
| `Services/BatchTriggerServiceTests.cs` | Trigger timing, utterance counting, bypass for urgent keywords |
| `Services/ClaraDoctorAgentTests.cs` | ReAct loop, prompt building, memory integration |
| `Services/CorrectiveRagServiceTests.cs` | RAG retrieval, rerank, corrective filter |
| `Services/DeepgramServiceTests.cs` | STT transcript parsing |
| `Services/KnowledgeSeederServiceTests.cs` | Document chunking + seeding |
| `Services/PatientContextServiceTests.cs` | PHI audit on access, context assembly |
| `Services/PHIAuditTests.cs` | Audit event published on every PHI access |
| `Services/SkillLoaderServiceTests.cs` | YAML clinical skill loading + validation |
| `Services/SuggestionCriticServiceTests.cs` | Critic: supported / removed / revised / LLM-failure paths |
| `Services/SuggestionServiceBuildPromptTests.cs` | `BuildAgentPrompt` contract |
| `Services/SuggestionServiceParseTests.cs` | LLM response parsing |
| `Services/PatientCompanionAgentTests.cs` | Patient-facing agent (future second agent) |
| `Hubs/` | SignalR hub unit tests |
| `Domain/` | Domain entity tests |
| `Validations/` | FluentValidation rule tests |
| `TestInfrastructure/` | Shared test helpers and fakes |

## Stack
- xUnit, NSubstitute, FluentAssertions, Bogus

## Run Command
```bash
dotnet test tests/Clara.UnitTests --filter "FullyQualifiedName~Clara.UnitTests"
```
