# ENG-06 reliability implementation evidence

Status: **In Progress**. This first implementation covers truthful liveness/readiness, explicit storage selection and bounded HTTP shutdown. The target has no durable job dispatcher yet; ENG-07 owns the outbox and dispatch integration. Real Supabase outage, end-to-end upload interruption, and process-level SIGTERM rehearsal remain open.

## Implemented behavior

- `/health/live` returns HTTP 200 based only on the running process.
- `/health/ready` and the existing `/health` aliases probe PostgreSQL and the configured storage driver. They return 503 when either dependency is unavailable and expose only safe `ready`/`unavailable` values. Shutdown flips readiness to 503 before the HTTP drain begins.
- The database and storage readiness checks have a three-second response deadline. Supabase requests use an abort signal; database probes are raced against the deadline.
- `STORAGE_DRIVER=supabase` checks Supabase configuration and all three private buckets. A failed Supabase upload rejects the operation and never writes to local disk.
- `STORAGE_DRIVER=filesystem` is local/test only. Production requires the explicit Supabase driver and the existing startup gate verifies private buckets before listening.
- SIGTERM/SIGINT stops HTTP admission, drains existing connections for up to ten seconds, closes remaining connections on timeout, and disconnects Prisma.

## Verification

The targeted server suite passed **37 tests across 7 files**, covering readiness responses and failure privacy, shutdown-state reporting, local marker cleanup, production storage selection, Supabase upload failure without local fallback, graceful/expired drains, and existing video/material/assignment upload behavior. Server typecheck and production build passed. The ENG-05 remote workflow at [run 39781488417](https://github.com/Hegazian/Digital-Platform/actions/runs/39781488417) confirms the previous branch revision's full test/build/browser matrix; this ENG-06 code has not yet been pushed or run remotely.

## Remaining work

- [ ] Push this implementation and retain its Node 22 CI evidence.
- [ ] Test readiness against real local PostgreSQL outage and configured Supabase outage, including recovery to ready.
- [ ] Rehearse SIGTERM while an HTTP request is held open and while an upload is in progress; verify the request outcome is honest and no local fallback object is created.
- [ ] Integrate a dispatcher readiness signal when ENG-07's durable outbox/worker exists; do not report queue health for a dispatcher that is not deployed.
- [ ] Complete browser retry handling if an existing screen incorrectly converts dependency outage into missing entitlement or lost unsent intent.

ENG-06 remains **In Progress** until the task's applicable A38 and operational evidence is reviewed.
