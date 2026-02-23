# MediTrack — Observability

## Overview

MediTrack uses **OpenTelemetry** to collect traces, metrics, and logs from all services. The telemetry data flows through an **OpenTelemetry Collector** which routes traces to **Jaeger** and metrics to **Prometheus**. Jaeger's Monitor tab reads span-derived metrics from Prometheus to display service performance (RED metrics).

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        .NET Services                                     │
│                                                                          │
│  ┌─────────────┐  ┌───────────────┐  ┌────────────────┐  ┌───────────┐  │
│  │ Identity.API│  │ Patient.API   │  │ Appointment.API│  │Records.API│  │
│  │             │  │               │  │                │  │           │  │
│  │ OpenTelemetry SDK (.WithTracing + .WithMetrics + Logging)         │  │
│  └──────┬──────┘  └───────┬───────┘  └───────┬────────┘  └─────┬─────┘  │
│         └─────────────────┼──────────────────┼──────────────────┘        │
│                           │ OTLP/gRPC :4317                              │
└───────────────────────────┼──────────────────────────────────────────────┘
                            ▼
              ┌─────────────────────────────┐
              │    OpenTelemetry Collector   │
              │                             │
              │  Receivers:  otlp (gRPC)    │
              │  Connectors: spanmetrics    │
              │  Processors: batch          │
              │                             │
              │  Pipelines:                 │
              │   traces  → Jaeger          │
              │           → spanmetrics     │
              │   metrics → Prometheus      │
              └──────┬──────────────┬───────┘
                     │              │
          OTLP/gRPC  │              │  Prometheus scrape :8889
                     ▼              ▼
         ┌──────────────┐  ┌──────────────┐
         │    Jaeger     │  │  Prometheus  │
         │              │  │              │
         │  Trace Store │  │ Metrics Store│
         │  UI :16686   │  │  UI :9090    │
         │              │  │              │
         │  Monitor tab ◄──┤ (query API)  │
         └──────────────┘  └──────────────┘
```

## Three Pillars of Observability

### 1. Traces (Jaeger)

**What**: A trace tracks a single request as it flows through the system. Each trace contains **spans** — individual units of work (HTTP request, DB query, message publish).

**How it works in MediTrack**:
1. A request hits `Patient.API`
2. ASP.NET Core instrumentation creates a root span
3. If the service makes an HTTP call (e.g. to another service), `HttpClient` instrumentation creates a child span
4. If the service publishes a RabbitMQ event, that creates another child span
5. All spans share the same `TraceId`, so Jaeger can reconstruct the full request path

**What to look for**:
- **Slow spans** — which operation in the chain is the bottleneck?
- **Error spans** — which service returned an error?
- **Fan-out** — does one request trigger too many downstream calls?

**Jaeger UI**: `http://localhost:16686/search`
- Select a service from the dropdown
- Click **Find Traces** to see recent traces
- Click a trace to see the span waterfall (timing breakdown)

### 2. Metrics (Prometheus + Jaeger Monitor)

**What**: Metrics are numerical measurements aggregated over time — request rate, error rate, latency percentiles.

**Two sources of metrics**:

| Source | What it measures | How |
|--------|-----------------|-----|
| **App metrics** (OTLP) | .NET runtime, ASP.NET Core request durations, HTTP client durations | OpenTelemetry SDK `WithMetrics()` → Collector → Prometheus |
| **Span metrics** (derived) | RED metrics per service/operation | Collector `spanmetrics` connector derives metrics from traces → Prometheus |

**RED metrics** (Rate, Errors, Duration):
- **Rate** — requests per second per service/endpoint
- **Errors** — error rate (% of requests that failed)
- **Duration** — latency distribution (p50, p95, p99)

**Jaeger Monitor tab**: `http://localhost:16686/monitor`
- Shows RED metrics per service
- Powered by the `spanmetrics` connector → Prometheus → Jaeger query

**Prometheus UI**: `http://localhost:9090`
- Raw metric queries (PromQL)
- Example: `traces_spanmetrics_latency_bucket{service_name="patient-api"}`

### 3. Logs (OpenTelemetry Logging)

**What**: Structured log entries correlated with traces via `TraceId` and `SpanId`.

**How it works in MediTrack**:
1. `AddOpenTelemetry()` is added to the logging pipeline
2. Log entries include `TraceId` and `SpanId` automatically
3. Logs are exported via OTLP to the Collector

**Note**: Jaeger primarily stores traces, not logs. For full log aggregation, consider adding **Loki** or **Elasticsearch** in the future. Currently, logs are visible in container stdout (`docker-compose logs -f <service>`).

## Configuration

### Service-side (OpenTelemetry SDK)

All services register OpenTelemetry via `MediTrack.ServiceDefaults`:

```csharp
// In each service's Program.cs
builder.AddServiceDefaults("service-name");
```

This calls `AddDefaultOpenTelemetry()` which registers:
- **Tracing**: ASP.NET Core + HttpClient instrumentation → OTLP exporter
- **Metrics**: ASP.NET Core + HttpClient instrumentation → OTLP exporter
- **Logging**: OpenTelemetry log exporter with formatted messages and scopes

The OTLP exporter reads `OTEL_EXPORTER_OTLP_ENDPOINT` env var automatically (no code configuration needed).

### Collector-side (otel-collector-config.yaml)

```
receivers:  otlp (gRPC :4317, HTTP :4318)
connectors: spanmetrics (derives metrics from trace spans)
exporters:  otlp/jaeger (forwards traces), prometheus (exposes :8889)

Pipeline: traces → batch → [jaeger, spanmetrics]
Pipeline: metrics → batch → prometheus
```

### Infrastructure

| Service | Port | Purpose |
|---------|------|---------|
| OTel Collector | 4317 (gRPC), 4318 (HTTP) | Receives OTLP from services |
| Jaeger | 16686 | Trace UI + Monitor tab |
| Prometheus | 9090 | Metrics storage + query |

## Dev URLs

| URL | What |
|-----|------|
| `http://localhost:16686/search` | Jaeger — search and inspect traces |
| `http://localhost:16686/monitor` | Jaeger — RED metrics dashboard (Rate, Errors, Duration) |
| `http://localhost:9090` | Prometheus — raw metric queries |
| `http://localhost:9090/targets` | Prometheus — verify scrape targets are UP |

## Troubleshooting

### No services in Jaeger dropdown
- Services only appear after sending at least one trace
- Hit a service endpoint: `curl http://localhost:5002/health`
- Wait a few seconds, then refresh Jaeger

### Monitor tab is empty
- Check Prometheus targets: `http://localhost:9090/targets` — `otel-collector` should be UP
- The `spanmetrics` connector needs trace data first — generate some traffic
- Span metrics take ~15s to appear (Prometheus scrape interval)

### No metrics in Prometheus
- Verify the collector is running: `docker-compose logs otel-collector`
- Check the collector's prometheus exporter: `curl http://localhost:8889/metrics` (if port is exposed)
- Verify scrape config in `prometheus.yml` points to `otel-collector:8889`

### Traces not reaching Jaeger
- Check that services have `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317`
- Verify the collector can reach Jaeger: `docker-compose logs otel-collector` (look for export errors)
- Ensure `depends_on` chain: services → otel-collector → jaeger
