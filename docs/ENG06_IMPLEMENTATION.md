# ENG-06 reliability implementation evidence

Status: **In Progress**. The implementation covers truthful liveness/readiness, explicit storage selection and bounded HTTP shutdown. A process-level regression now starts the API, holds a readiness probe on a deliberately stalled loopback database, sends SIGTERM, and asserts that the in-flight request receives a draining 503 before the process exits. Windows cannot deliver this POSIX signal to a child process, so the test is skipped locally there and awaits Linux CI execution. The target has no durable job dispatcher yet; ENG-07 owns the outbox and dispatch integration. Real Supabase outage and end-to-end upload interruption remain open.

## Implemented behavior

- `/health/live` returns HTTP 200 based only on the running process.
- `/health/ready` and the existing `/health` aliases probe PostgreSQL and the configured storage driver. They return 503 when either dependency is unavailable and expose only safe `ready`/`unavailable` values. Shutdown flips readiness to 503 before the HTTP drain begins.
- The database and storage readiness checks have a three-second response deadline. Supabase requests use an abort signal; database probes are raced against the deadline.
- `STORAGE_DRIVER=supabase` checks Supabase configuration and all three private buckets. A failed Supabase upload rejects the operation and never writes to local disk.
- `STORAGE_DRIVER=filesystem` is local/test only. Production requires the explicit Supabase driver and the existing startup gate verifies private buckets before listening.
- SIGTERM/SIGINT stops HTTP admission, drains existing connections for up to ten seconds, closes remaining connections on timeout, and disconnects Prisma.

## Verification

The earlier targeted server suite passed **37 tests across 7 files**, covering readiness responses and failure privacy, shutdown-state reporting, local marker cleanup, production storage selection, Supabase upload failure without local fallback, graceful/expired drains, and existing video/material/assignment upload behavior. After adding the process-level SIGTERM regression, the full suite passed **441 tests across 81 files** locally; one POSIX-only process test was skipped on Windows with an explicit platform rationale. The server typecheck and production build passed. The Linux signal path still needs exact-head CI execution. Commit **b6dd8d462a1f4d111f94c6125259d0576738beb9** was pushed and all five Node 22 checks passed in [run 39788280147](https://github.com/Hegazian/Digital-Platform/actions/runs/39788280147). Later integration evidence is recorded in [the final M0 review](M0_FINAL_REVIEW.md); this historical run is not attributed to subsequent code.

## Remaining work

- [x] Push this implementation and retain its Node 22 CI evidence.
- [ ] Test readiness against real local PostgreSQL outage and configured Supabase outage, including recovery to ready.
- [ ] Run the new POSIX process-level SIGTERM regression on Linux CI; manually rehearse SIGTERM while an upload is in progress and verify the request outcome is honest and no local fallback object is created.
- [ ] Integrate a dispatcher readiness signal when ENG-07's durable outbox/worker exists; do not report queue health for a dispatcher that is not deployed.
- [ ] Complete browser retry handling if an existing screen incorrectly converts dependency outage into missing entitlement or lost unsent intent.

ENG-06 remains **In Progress** until the task's applicable A38 and operational evidence is reviewed.
