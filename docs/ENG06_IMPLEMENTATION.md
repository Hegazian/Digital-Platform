# ENG-06 reliability implementation evidence

Status: **In Progress**. The implementation covers truthful liveness/readiness, explicit storage selection and bounded HTTP draining plus bounded Prisma cleanup. The current process regression starts the API, holds a readiness probe on a stalled loopback database, invokes shutdown, asserts a draining 503, settles the fixture connection and verifies clean exit. Windows invokes the registered SIGTERM handler through a test-only child IPC bootstrap; POSIX uses native SIGTERM. The independent review found and rechecked this fixture/deadline correction as [M1-R05](M1_REVIEW.md). No platform skip remains. Shutdown now has a 10-second HTTP drain and up to five more seconds for Prisma cleanup; if the shared-resource cleanup does not settle, the process exits nonzero at the total deadline. Stale private upload files are cleaned at startup and every six hours after a 24-hour retention. The target has no durable job dispatcher yet; ENG-07 owns outbox/dispatch. Real Supabase outage, shutdown during upload and native Linux CI remain acceptance items.

## Implemented behavior

- `/health/live` returns HTTP 200 based only on the running process.
- `/health/ready` and the existing `/health` aliases probe PostgreSQL and the configured storage driver. They return 503 when either dependency is unavailable and expose only safe `ready`/`unavailable` values. Shutdown flips readiness to 503 before the HTTP drain begins.
- The database and storage readiness checks have a three-second response deadline. Supabase requests use an abort signal; database probes are raced against the deadline.
- `STORAGE_DRIVER=supabase` checks Supabase configuration and all three private buckets. A failed Supabase upload rejects the operation and never writes to local disk.
- `STORAGE_DRIVER=filesystem` is local/test only. Production requires the explicit Supabase driver and the existing startup gate verifies private buckets before listening.
- SIGTERM/SIGINT stops HTTP admission, drains existing connections for up to ten seconds, closes remaining connections on timeout, and gives Prisma up to five additional seconds to disconnect. If cleanup hangs or fails, the process exits nonzero instead of waiting indefinitely.
- Startup and periodic cleanup remove only expired regular `.upload` files from the private staging directory; the 24-hour age threshold exceeds the 15-minute upload request timeout.

## Verification

The full server suite passed **446 tests across 81 files, zero skips**, including a process-level test that leaves the database handshake stalled and verifies nonzero exit at the cleanup deadline. Server typecheck and build passed. The focused shutdown/storage set passed **18 tests across 3 files** before the second process scenario was added; the full suite includes both scenarios. Coverage passed all 446 tests but exits 1 because server functions are **89.82%**, below the 90% threshold. Historical commit **b6dd8d462a1f4d111f94c6125259d0576738beb9** passed all five Node 22 checks in [run 39788280147](https://github.com/Hegazian/Digital-Platform/actions/runs/39788280147); it does not validate this implementation. Native Linux CI, real Supabase outage and shutdown during upload remain external acceptance checks.

## Remaining work

- [x] Push this implementation and retain its Node 22 CI evidence.
- [ ] Test readiness against real local PostgreSQL outage and configured Supabase outage, including recovery to ready.
- [ ] Run native SIGTERM on Linux CI; manually rehearse shutdown while an upload is in progress and verify the request outcome is honest and no local fallback object is created. The total process deadline is implemented and locally covered; verify it under a real unresponsive dependency in the target deployment.
- [ ] Integrate a dispatcher readiness signal when ENG-07's durable outbox/worker exists; do not report queue health for a dispatcher that is not deployed.
- [ ] Complete browser retry handling if an existing screen incorrectly converts dependency outage into missing entitlement or lost unsent intent.

ENG-06 remains **In Progress** until the task's applicable A38 and operational evidence is reviewed.
