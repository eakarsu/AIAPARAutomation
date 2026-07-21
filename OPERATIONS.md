# Operations and trust boundary

Normal startup does not install, migrate, seed, start PostgreSQL, or terminate port owners. Use the three explicit scripts under `scripts/` and a dedicated demo database for fixtures.

Only authentication, health, and invoice-posting workflows are supported by default. Historical generated/model routes return `410 prototype_route_quarantined`. They require `ENABLE_LEGACY_PROTOTYPE_ROUTES=true` for local inspection, and that setting is forbidden in production.

`/api/invoice-posting-workflows` performs a deterministic, provenance-aware three-way match with bounded currency tolerance, receipt acceptance, duplicate and vendor-bank-change holds. A creator submits a match, then two different approvers must approve sequentially. The terminal local state is `approved_for_posting`: it is intentionally not `posted` until a configured ERP returns an external id. Every transition is tenant-scoped, idempotent at ingestion, and audited.

OCR, ERP/vendor master, payment rail, tax engine, document storage, labeled extraction evaluation, and ledger reconciliation require real external systems and finance-owner validation.
