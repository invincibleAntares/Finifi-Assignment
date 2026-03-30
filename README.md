# Three-Way Match Engine (PO · GRN · Invoice)

Backend service to upload **PO / GRN / Invoice** PDFs, extract structured data using **Gemini**, store it in **MongoDB**, and compute a **three-way match** by `poNumber` (upload order does not matter).

## What this project does

- **Upload PDFs** (`po`, `grn`, `invoice`)
- **Parse PDFs with Gemini** into structured JSON
- **Store parsed data** in MongoDB
- **Link documents by** `poNumber`
- **Three-way match** at item level and return:
  - `matched` / `partially_matched` / `mismatch` / `insufficient_documents`
  - mismatch reason codes

## Tech stack

- Node.js + Express
- MongoDB + Mongoose
- Gemini API

## Project structure

Key files/folders:

- `src/server.js` / `src/app.js`: app bootstrap + routes
- `src/models/`: `Document`, `PurchaseOrder`, `GRN`, `Invoice`, `MatchResult`
- `src/modules/documents/`: upload + storage pipeline
- `src/modules/parsing/`: Gemini prompt + parsing + mapping
- `src/modules/matching/`: matching logic + match API

## Setup

### 1) Install

```bash
npm install
```

### 2) Configure environment

Create a `.env` file (see `.env.example`):

- `PORT=3000`
- `MONGO_URI=mongodb://127.0.0.1:27017/three_way_match`
- `GEMINI_API_KEY=...`
- `GEMINI_MODEL=gemini-flash-lite-latest` (optional)

### 3) Run

```bash
npm run dev
```

Health check:

- `GET /health`

## API

### 1) Upload document

`POST /documents/upload`

- **Body**: `multipart/form-data`
  - `documentType`: `po | grn | invoice`
  - `file`: PDF

Behavior (single request):
- saves PDF to `uploads/<documentType>/`
- parses with Gemini
- stores:
  - upload record in `documents`
  - structured record in `purchaseorders` / `grns` / `invoices`
- recomputes match for that `poNumber`

### 2) Get parsed document

`GET /documents/:id`

- Default returns `parsed.normalized`
- Add `?includeRaw=true` to include `parsed.raw` (Gemini JSON)

### 3) Get match result

`GET /match/:poNumber`

- Returns linked docs + match status + mismatch reasons
- Add `?includeDebug=true` to include debug totals (optional)

## Data model (high level)

### `Document` (uploads + parsing)

- `documentType`: `po|grn|invoice`
- `status`: `uploaded|parsed|parse_failed`
- `file`: `{ originalName, mimeType, size, path }`
- `extracted`: `{ poNumber, poDate?, grnNumber?, invoiceNumber?, ... }`
- `parsed.raw`: raw Gemini JSON
- `parsed.normalized`: normalized shape used by storage/matching

### Structured collections

- `PurchaseOrder` (many allowed; matching flags `duplicate_po`)
- `GRN` (unique per `poNumber + grnNumber`)
- `Invoice` (unique per `poNumber + invoiceNumber`)
- `MatchResult` (unique per `poNumber`)

Per item we store:
- `sku` (numeric when available)
- `docItemCode` (document-local code, e.g. invoice FG-…)
- `rawDescription` (Gemini extracted row text)
- `cleanDescriptionFromGemini` (Gemini cleaned description)
- `normalizedDescription` (backend light normalization)
- quantity field (`quantity` / `receivedQuantity`)

## Parsing flow

1. User uploads a PDF with `documentType`
2. Gemini returns structured JSON (one row per item)
3. Backend maps it into:
   - `Document.parsed.raw` (Gemini JSON)
   - `Document.parsed.normalized` (stable internal shape)
4. Backend stores into the typed collection (`PurchaseOrder` / `GRN` / `Invoice`)

## Matching logic

For a given `poNumber`:

1. Fetch latest PO + all GRNs + all invoices
2. **Item matching strategy**
   - **SKU-first** (when both sides have numeric SKU)
   - fallback to `normalizedDescription`
3. Apply required rules (item-level totals):
   - **GRN qty ≤ PO qty** → `grn_qty_exceeds_po_qty`
   - **Invoice qty ≤ total GRN qty** → `invoice_qty_exceeds_grn_qty`
   - **Invoice qty ≤ PO qty** → `invoice_qty_exceeds_po_qty`
   - **Invoice date must not be after PO date** → `invoice_date_after_po_date`
4. Status:
   - `insufficient_documents` if missing PO or missing GRN(s) or missing invoice(s)
   - `mismatch` if any rule is violated
   - `matched` if all item totals fully reconcile
   - `partially_matched` if all docs exist, no violations, but totals don’t fully reconcile yet

## Out-of-order uploads

Upload order does not matter because:
- each upload stores its own structured record
- after every successful upload+parse+store, the system recomputes the match result for that `poNumber`

To avoid double counting when the same GRN/Invoice is uploaded twice:
- GRN is unique by `(poNumber, grnNumber)`
- Invoice is unique by `(poNumber, invoiceNumber)`
- matcher also deduplicates by these business numbers before summing

## Assumptions

- PDFs contain a reliable `poNumber` (used as the link key)
- PO/GRN use numeric product codes more often than Invoice (invoice may have document-local item codes)
- Gemini is used for **structured extraction + text cleanup only** (not for deciding which items “match”)
- We store both raw + normalized fields for debugging (`rawDescription`, `cleanDescriptionFromGemini`, `normalizedDescription`)
- Invoice item codes like `FG-...` are treated as **document-local** identifiers and are **not** used as cross-document keys

## Tradeoffs

- Matching by `normalizedDescription` is a fallback and can still be imperfect if descriptions differ materially.
- Variants (e.g. `ORIGINAL` vs non-`ORIGINAL`) are treated as **distinct** unless the dataset makes equivalence explicit.
- This is not a production-grade pipeline (no job queue, no retries/backoff, no auth).

## Known limitations (current matching behavior)

- Some items may still show `item_missing_in_po` due to naming differences across systems (e.g. word order, pluralization, “pack” wording).
- We intentionally avoided heavy fuzzy matching / synonym engines to keep the solution clean and maintainable for the assignment scope.

## What I would improve with more time

- Add async processing (queue) for parsing/matching
- Add stronger item matching (token similarity + pack-size extraction + confidence scoring)
- Add OpenAPI/Swagger + request validation
- Add tests + fixtures for multiple PDF layouts

## API usage examples (Postman)

Import the collection:
- `postman/three-way-match.postman_collection.json`

## Example outputs

Add these after you run a clean test (clear DB, re-upload PO/GRN/Invoice once):

- **Parsed document example**: paste a response from `GET /documents/:id?includeRaw=true`
- **Match result example**: paste a response from `GET /match/:poNumber`

