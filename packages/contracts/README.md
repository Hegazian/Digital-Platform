# Shared contracts

Install the package before either application so Node can resolve its Zod dependency from the linked workspace:

```powershell
npm ci --prefix packages/contracts
npm run check --prefix packages/contracts
npm ci --prefix server
npm ci --prefix client
```

`src/index.ts` owns the runtime schemas and inferred types. `npm run build` generates the committed `dist/` artifacts and OpenAPI 3.1 components. CI rebuilds them and rejects source/generated drift, then tests safe catalog serialization. OpenAPI currently documents schema components; an empty paths object makes no claim that staged revision, import, asset-worker, taxonomy, or durable-event APIs exist.

Current consumers validate catalog output, retraction, manual checkout and voucher input, and import shared API error types. C01–C10 schema representatives are registered; full endpoint/type adoption and richer domain contracts remain ENH-02 and their respective domain tasks. See [the contract register](../../docs/API_DATA_CONTRACTS.md) and [next steps](../../docs/NEXT_STEPS.md).

When changing a schema, update its owning API and consumer together, regenerate artifacts, add compatibility/security cases, and review the generated diff. Security redactions must not be undone by a legacy adapter.
