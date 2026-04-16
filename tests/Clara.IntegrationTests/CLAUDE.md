# Clara.IntegrationTests — Integration Tests for Clara.API

## Overview
End-to-end HTTP and SignalR tests against a real PostgreSQL + pgvector database. Requires Docker. All external AI providers (embeddings, LLM) are replaced with deterministic fakes.

## Test Files
| File | Covers |
|------|--------|
| `SessionLifecycleTests.cs` | Session CRUD: create → add transcript → complete → query |
| `KnowledgeSearchTests.cs` | Document upload → embed → vector similarity search |
| `SignalRHubTests.cs` | `SessionHub` real-time events over a live SignalR connection |

## Test Infrastructure
| File | Purpose |
|------|---------|
| `ClaraApiFactory.cs` | `WebApplicationFactory<Program>` — boots Clara.API with test overrides |
| `TestAuthHandler.cs` | Fake JWT auth handler — injects `UserId`, `Role` claims without IdentityServer |
| `FakeEmbeddingGenerator.cs` | Deterministic embeddings (avoids OpenAI calls in CI) |
| `TestDataSourceFactory.cs` | Replaces `NpgsqlDataSourceBuilder` with pgvector + json enabled instance |

## Rules
- **ALWAYS** use `ConfigureTestServices` (not `ConfigureServices`) — runs AFTER app DI setup
- **NEVER** call real AI APIs — always replace via `ClaraApiFactory` overrides
- **ALWAYS** create test data via the API (not direct DB inserts) — respects aggregate invariants
- **ALWAYS** replace auth with `TestAuthHandler` — real JWT needs IdentityServer running

## Run Command (requires Docker)
```bash
dotnet test tests/Clara.IntegrationTests --filter "FullyQualifiedName~Clara.IntegrationTests"
```
