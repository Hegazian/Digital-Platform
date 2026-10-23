# ENG-06 reliability implementation evidence

Status: **In Progress**. The implementation covers truthful liveness/readiness, explicit storage selection and bounded HTTP draining. The current process regression starts the API, holds a readiness probe on a stalled loopback database, invokes shutdown, asserts a draining 503, settles the fixture connection and verifies clean exit. Windows invokes the registered SIGTERM handler through a test-only child IPC bootstrap; POSIX uses native SIGTERM. The independent review found and rechecked this fixture/deadline correction as [M1-R05](M1_REVIEW.md). No platform skip remains. The target has no durable job dispatcher yet; ENG-07 owns outbox/dispatch. Real Supabase outage, shutdown during upload, native Linux execution and a total cleanup deadline under an unresponsive real dependency remain acceptance items.

## Implemented behavior

- `/health/live` returns HTTP 200 based only on the running process.
- `/health/ready` and the existing `/health` aliases probe PostgreSQL and the configured storage driver. They return 503 when either dependency is unavailable and expose only safe `ready`/`unavailable` values. Shutdown flips readiness to 503 before the HTTP drain begins.
- The database and storage readiness checks have a three-second response deadline. Supabase requests use an abort signal; database probes are raced against the deadline.
- `STORAGE_DRIVER=supabase` checks Supabase configuration and all three private buckets. A failed Supabase upload rejects the operation and never writes to local disk.
- `STORAGE_DRIVER=filesystem` is local/test only. Production requires the explicit Supabase driver and the existing startup gate verifies private buckets before listening.
- SIGTERM/SIGINT stops HTTP admission, drains existing connections for up to ten seconds, closes remaining connections on timeout, and disconnects Prisma.

## Verification

The current full server coverage suite passed **442 tests across 81 files, zero skips**, including the repaired process regression; server typecheck passed. Coverage and fresh build results are recorded in [M1 evidence](../audit/m1-review/verification.json). The earlier targeted suite passed **37 tests across 7 files**, covering readiness failure privacy, draining state, marker cleanup, production storage selection, Supabase failure without fallback and graceful/expired HTTP drains. Historical commit **b6dd8d462a1f4d111f94c6125259d0576738beb9** passed all five Node22 checks in [run 39788280147](https://github.com/Hegazian/Digital-Platform/actions/runs/39788280147); this result does not validate later M1 changes. The Linux signal path still needs CI for the final commit.

## Remaining work

- [x] Push this implementation and retain its Node 22 CI evidence.
- [ ] Test readiness against real local PostgreSQL outage and configured Supabase outage, including recovery to ready.
- [ ] Run native SIGTERM on Linux CI; manually rehearse shutdown while an upload is in progress and verify the request outcome is honest and no local fallback object is created. Verify a total process-exit deadline if dependency cleanup remains unresponsive; the HTTP-drain timeout alone does not bound Prisma disconnect.
- [ ] Integrate a dispatcher readiness signal when ENG-07's durable outbox/worker exists; do not report queue health for a dispatcher that is not deployed.
- [ ] Complete browser retry handling if an existing screen incorrectly converts dependency outage into missing entitlement or lost unsent intent.

ENG-06 remains **In Progress** until the task's applicable A38 and operational evidence is reviewed.
