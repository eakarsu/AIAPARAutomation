# Audit Apply Note — AIAPARAutomation

## Audit recommendations (from batch_00.md)

Substantive: 15 routes, 16 AI endpoints. Production-grade AP/AR automation.

### Missing AI counterparts
- AI 3-way matching OCR
- AI vendor fraud detection

### Missing non-AI features
- Accounting system integration (SAP, Oracle, NetSuite)
- Payment processing (ACH, wire, check)
- Multi-currency handling

### Custom feature suggestions
- OCR + NLP invoice extraction
- Real-time vendor health (D&B, S&P)
- Predictive payment failure
- Tax optimization
- ERP integrations

## Implemented in this pass

None. Substantive (16 AI endpoints). Genuinely missing items require OCR pipelines, ERP integrations, or external data providers.

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| 3-way matching OCR | TOO-RISKY | OCR + parser + DB schema |
| Vendor fraud detection | TOO-RISKY | Needs new fraud schema/scoring |
| ERP integrations | NEEDS-CREDS | SAP/Oracle/NetSuite/QuickBooks creds |
| Payment processing | NEEDS-CREDS | ACH/wire/check rails |
| Multi-currency | NEEDS-PRODUCT-DECISION | FX policy |
| D&B / S&P feeds | NEEDS-CREDS | Vendor data subscription |

## Apply pass 5 (all backlog)

Added 4 new endpoints (capped) targeting the original backlog items: 3-way matching, vendor fraud detection, multi-currency FX, and ERP mapping suggestions. All gated behind a hardened `requireOpenRouterKey()` helper that recognises common placeholder strings; 503 responses include `missing: <ENV>`.

Backend (`backend/routes/ai.js`):
- `POST /api/ai/three-way-matching` — text-only AI reasoner over invoice/PO/receipt JSON. Originally TOO-RISKY because of OCR; this pass ships an additive stub (no OCR) plus new `three_way_match_runs` table with `CREATE TABLE IF NOT EXISTS`.
- `POST /api/ai/vendor-fraud-detection` — risk scoring with new `vendor_fraud_scores` table. TOO-RISKY originally; additive stub only.
- `POST /api/ai/multi-currency-fx` — NEEDS-PRODUCT-DECISION. PRODUCT-DECISION: rates supplied in body; default `reportingCurrency=USD`; no live FX API.
- `POST /api/ai/erp-mapping-suggest` — MECHANICAL field-mapping aid (NetSuite/SAP/Oracle/QuickBooks). Real connectors stay backlog (NEEDS-CREDS).

Frontend: new pages `ThreeWayMatching.jsx`, `VendorFraudDetection.jsx`, `MultiCurrencyFx.jsx`, `ErpMappingSuggest.jsx`; routes added in `App.jsx`; 4 new cards in `Dashboard.jsx`.

Smoke test: started backend on 4801, `/api/health` 200, login (demo@apar.com / demo123) 200, all 4 new endpoints returned 503 with `missing: OPENROUTER_API_KEY` (correct — `.env` has placeholder). `node --check` passes on `routes/ai.js`.

Items still backlog: real ERP API connectors (NEEDS-CREDS), live FX (NEEDS-CREDS), payment rails (NEEDS-CREDS), D&B/S&P feeds (NEEDS-CREDS), full OCR pipeline (TOO-RISKY beyond stub).

## Apply pass 3 (frontend)

Frontend was already comprehensively wired before this pass. `frontend/src/App.jsx`
defines 21 routes mapping to dedicated pages for every AI endpoint in
`backend/routes/ai.js` (InvoiceMatching, PaymentReconciliation,
DunningOptimization, CashApplication, DiscountCapture, AgingAnalysis,
VendorHealth, CreditAdvisor, DunningLetterGenerator, InvoiceAnomalyDetector,
CashFlowForecast, IntercompanyOptimizer, TaxCompliance, DiscountDashboard,
AIHistory). Pages send `Authorization: Bearer ${token}` from localStorage and
share an `AIResultDisplay` component. Backend `app.use('/api/ai', ...)` registration
verified. **Action: LEFT-AS-IS — FE already wired.**
