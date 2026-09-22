# TM Express v2 — Rebuild Spec

Supersedes the phased v1 spec for the purposes of this rebuild. Simpler, flatter architecture: manual data entry per client, VOL-assisted client search, document expiry tracking that drives the todo list, and one reusable EmailChase modal.

**Stack:** React frontend, Supabase (auth + Postgres + file storage), hosted prod on `tmex.vercel.app` (Vercel), dev on GitHub.

---

## 1. Auth
- Supabase standard email/password sign-up and sign-in
- Each TM has their own account; all clients, vehicles, drivers, documents, todos scoped to that user via Supabase row-level security

## 2. Homepage
- Client list (name, OL number, status)
- "+" button next to "Clients" opens the **Add Client dialog**

## 3. Add Client dialog
- Text input: OL number or business name
- As the user types, query DVSA's public operator register (no login required) and show matching results live
- User selects a result → autofills what the register provides (company name, OL number, registered address, operating centre) directly into a new CompanyPage record
- Anything the register doesn't provide is left blank for manual entry
- Vehicles, drivers, visits, and infringements are always added manually afterward on CompanyPage — the VOL register doesn't reliably expose fleet-level detail, so no attempt to autofill those
- If no VOL match is found, the user can still create the client manually with just a name

## 4. CompanyPage
- Header: company name, OL number, onboarding status
- Top-right dropdown (next to company name) includes: **"Chase all outstanding"** — generates an EmailChase pre-filled with every open todo for this client rolled into one email (template subject + body listing each missing/overdue item), recipients auto-filled from the client's saved contact(s)
- Sections, each showing a list of rows that link out to their own detail page:
  - **Vehicles** → each row opens **VehiculePage**
  - **Drivers** → each row opens **DriverPage**
  - **Last Visit** → each row (or "log a visit") opens **LastVisitPage**
  - **Infringements** → each row opens **InfringementPage**
  - **Documents** (paginated, as already in the Figma design) — a flat view of every document across the client
  - **Todo** — this client's open items only

## 5. Detail pages (VehiculePage / DriverPage / LastVisitPage / InfringementPage)
Each entity type gets its own page. All of them share the same document-upload pattern:
- User uploads a document (file)
- Expiry date field — **auto-suggested** (based on document type's typical interval, e.g. PMI cycle, MOT annual, brake test 90-day-ish) but always editable
- **Reminder lead time** — user sets how many days before expiry a todo should be created (e.g. "remind me 14 days before this MOT expires")
- When today's date crosses (expiry date − reminder lead time), a todo is created automatically; when the document is replaced with a fresh one before expiry, no todo fires

### VehiculePage
- Registration, type
- Documents: PMI, Brake test, MOT, VED, Insurance — each with expiry + reminder lead time
- Infringements linked to this vehicle (pending your answer above)

### DriverPage
- Name
- Documents: Licence check, CPC — each with expiry + reminder lead time
- Infringements linked to this driver (pending your answer above)

### LastVisitPage
- Date of visit, findings/notes
- Documents: depot visit note upload, with its own expiry/reminder if you want the *next* visit due date tracked the same way (worth confirming — a visit doesn't "expire" the way a certificate does, so this may instead just track "next visit due" as a plain date rather than a document-expiry pattern)

### InfringementPage
- Manual entry — no document upload driving this one; it's a logged fact, not a certificate
- Category (one of the four below) + specific type + linked driver_id and/or vehicle_id + date + notes + resolved status
- **Surfacing:** an infringement tagged with a driver_id and/or vehicle_id shows in both places — on the company's Infringements list AND on that specific Driver/Vehicle page, so it's visible from whichever page the TM is already looking at. An infringement tagged only `client_id` (the Licence & Operator Infrastructure category) shows only in the Infringements list, since there's no driver/vehicle page for it to also live on.

## 6. Infringement taxonomy
Stored as a fixed category → type list, each type tagged with which entity it links to:

**Driver Hours & Tachograph** (`driver_id`)
Daily Driving Excess · Continuous Driving Excess · Insufficient Daily Rest · Insufficient Weekly Rest · Missing Tachograph Card Data · Driving Without Card · Mode Switch Errors

**Vehicle Roadworthiness & Maintenance** (`vehicle_id`)
Overdue PMI · Expired MOT · Missing Vehicle Unit (VU) Download · Overdue Rolling Road Brake Test · Unresolved Safety Defect · Active PG9 Prohibition Notice

**Operational Loading & Weight** (`vehicle_id` + `driver_id`)
Gross Vehicle Weight Overload · Axle Weight Overload · Insecure Load

**Licence & Operator Infrastructure** (`client_id`)
Operating Centre Breach · Fleet Limit Excess (Over-fleeting) · Expired Operator Insurance · Overdue Driver Licence Check · Expired Driver CPC

## 7. Todo list

### Lifecycle
- **Creation:** a document todo is created when today's date reaches (expiry date − reminder lead time) set on that document, per section 5. An infringement todo is created the moment the infringement is logged.
- **Resolution:** a document todo resolves and disappears from the list the moment the user uploads a new document of that type for that vehicle/driver — no separate "mark as resolved" step needed. An infringement todo resolves when its `resolved` status is set to true.
- **Chase cooling period:** when the user chases a document todo via EmailChase, the todo disappears from the list for **3 days** rather than resolving outright — this is a grace period to let the client respond, not a resolution. If no matching document has been uploaded by the end of the 3 days, the todo reappears automatically. Uploading a document at any point during the cooling period resolves it early and it stays gone. (Infringement todos aren't document-driven, so chasing one via EmailChase doesn't apply this cooling period — resolution stays tied to the `resolved` flag.)
- Each todo, when clicked, navigates to the exact page and section it concerns (e.g. an overdue PMI todo opens that vehicle's VehiculePage, scrolled to its PMI document)
- Each todo has an envelope-icon action that opens **EmailChase**, scoped to that single item only, which triggers the 3-day cooling period described above

### Data model addition
- **Todo** gains a `snoozed_until` field (nullable) — set to (chase date + 3 days) when a chase is sent.
- **Check mechanism: on-demand, not a background job.** No scheduled task runs to clear `snoozed_until` on its own. Instead, every time the todo list is loaded, the query filters out any todo where `snoozed_until` is still in the future — so a todo whose 3 days have elapsed simply stops being filtered out the next time the list is fetched. Simple to build, no cron/Edge Function needed.
- **Known tradeoff, accepted for now:** because this is on-demand rather than a background wake-up, a todo doesn't resurface (no badge update, no notification) until the user actually opens TM Express after the cooling period ends — it isn't proactive. Fine for a single-user build where opening the app daily is the norm; worth revisiting if a background check (e.g. Supabase pg_cron) becomes worth the added complexity later, particularly once notifications matter for peer-TM use.

## 8. EmailChase (shared modal, two entry points)
- **From a todo item:** scoped to that one missing/overdue item — recipient auto-filled from client contact(s), subject/body templated around that specific document/vehicle/driver
- **From CompanyPage's dropdown ("Chase all outstanding"):** aggregates every open todo for the client into one email — one recipient set, one subject, a body listing each outstanding item
- Both cases: recipient, subject, and body are pre-filled but editable before sending

## 9. Data model (entities)
- **User** (Supabase auth)
- **Client** — owner (user_id), company_name, ol_number, address, operating_centre, onboarding_status, contacts[] (name, email)
- **Vehicle** — client_id, registration, type
- **Driver** — client_id, name
- **Visit** — client_id, date, notes
- **Infringement** — client_id, category, type, driver_id (nullable), vehicle_id (nullable), date, notes, resolved
- **Document** — polymorphic: parent_type (vehicle/driver/visit/client), parent_id, doc_type, file (Supabase storage), expiry_date, reminder_days_before, uploaded_at
- **Todo** — client_id, source_type (document/infringement), source_id, description, status, created_at, resolved_at
- **EmailChase** — client_id, scope (single_todo/all_outstanding), todo_id (nullable), recipients, subject, body, sent_at

## 10. Hosting
- **Dev:** GitHub repo, local development
- **Prod:** Vercel, deployed at `tmex.vercel.app` (or a custom domain later if you register one)
