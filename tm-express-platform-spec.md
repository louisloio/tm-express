# TM Express — Platform Spec

## What TM Express is
A platform that monitors a Transport Manager's email inbox and a client-facing portal to keep OL (Operator Licence) holders and their TMs compliant — covering DVLA/TC appointment authorisation, ongoing document collection, and compliance tracking, across multiple TMs and multiple clients per TM.

---

## 1. TM appointment / onboarding flow

This is the entry point before any compliance work starts, and it's DVLA/TC-driven, not something TM Express can shortcut:

1. **OL owner hires a TM.** The OL owner nominates the TM on the DVLA/VOL system.
2. **DVLA emails the TM** — a "You've been named as a Transport Manager" email naming the OL owner and application number, followed ~2 hours later by a separate "Your temporary password" email for VOL sign-in.
3. **TM submits a disclosure form on VOL** — no API exists for third parties to submit into VOL, so TM Express never auto-submits; it prepares a ready-to-copy application pack instead. Fields fall into three buckets:
   - **Stable identity data (stored once, reused every time):** name, DOB, place of birth, email, home/work address, CPC certificate file, training-in-last-5-years status
   - **Calculated fresh per application (TM Express's main value-add here):** hours/week proposed for this licence; whether named as TM/Director/Partner on other licences; the capacity explanation document, auto-drafted from the TM's live client roster and current allocated hours if under the recommended amount
   - **Per-application legal attestations (never pre-filled or carried over):** convictions, revoked/curtailed/suspended licences, other employment — these are direct attestations to DVLA and must be answered fresh each time even if the facts haven't changed
4. **DVLA reviews and approves or rejects** the TM's capacity to take on this client, based on the hours/vehicle ratio (Statutory Document 3, Annex 1).
5. **On approval**, the TM is authorised and the client relationship formally starts.

**TM Express's role here:** it can't submit the DVLA form on the TM's behalf (that's DVLA's own platform and a regulatory act the TM must own — automating a login-walled government form isn't something to build toward), but it should:
- Detect the two DVLA onboarding emails and flag them as an onboarding trigger (see detection rule below)
- Generate the application pack described above, ready for the TM to copy into VOL
- Track the application status (submitted → pending → approved/rejected) as a manual status update from the TM, since DVLA doesn't expose this to a third-party system
- On approval, trigger the "new client setup" workflow below automatically

### Onboarding detection rule
DVLA sends two separate emails, from `notifications@vehicle-operator-licensing.service.gov.uk`, roughly two hours apart:

1. **Trigger email** — subject "You've been named as a Transport Manager". Body contains the OL owner's company name, the OL application number (e.g. OF2068149/1600112), and a VOL username.
2. **Follow-up email** — subject "Your temporary password". Contains the temporary password for that same VOL account.

Detection logic:
- Match on sender domain (`vehicle-operator-licensing.service.gov.uk`) plus subject line — not on generic keyword matching, to avoid false positives from unrelated DVLA correspondence
- On email 1: extract company name and OL application number, create a "pending onboarding" record, prompt the TM to begin the hours-disclosure form on VOL
- On email 2 (matched to the same pending record by arrival within a short window, e.g. same day): store the VOL username/password pairing as a reference note only — TM Express does not use these credentials to act on the TM's behalf; they're for the TM's own sign-in
- If email 2 doesn't arrive within ~2–3 hours of email 1, no action needed — this is normal DVLA delivery lag, not a failure
- TM manually updates the pending record once DVLA approves or rejects, which fires the "new client setup" workflow

## 2. New client setup (first task after approval)

Once approved, the TM's first task is to get the client's data into the system and start the recurring compliance asks:

- Create the client record: OL number, vehicles (reg, type), drivers, key contacts
- Set the client's email as a recognised sender/thread for document parsing (see section 5)
- Configure recurring compliance requests to the client for: PMI, brake test, driver infringements (tacho), MOT, VED, insurance — on the 3-day chase cadence already confirmed
- Set the monthly depot visit expectation for this client
- Client enters the pipeline in "onboarding" status until the compliance status model below can be evaluated

## 3. Client compliance status model

This is the core status TM Express surfaces per client, and it tracks two separate things that must not be conflated:

**A. Client compliance status** — is the client's fleet actually documented and compliant right now:
- **Green (fully compliant):** every required document is current and on file — PMI, MOT, VED, insurance, driver licence checks, brake test/EBPMS records — the onsite depot visit has been completed within the expected monthly interval, and there are no pending/unresolved infringements
- **Amber (in progress):** one or more items are outstanding but within the active chase cycle — request sent, response window still open, nothing yet overdue
- **Red (overdue/non-compliant):** an item has passed its chase window with no response, a document has expired with no replacement on file, an infringement is unresolved past a reasonable window, or a depot visit is overdue

**B. TM conduct status** — is the TM doing what continuous and effective management requires, independent of whether the client has actually responded:
- The TM is compliant with their own duty the moment a compliance request has been sent and the chase cycle is actively running — even if the client's documents are still outstanding (client Amber/Red)
- This matters because TC scrutiny of the TM personally rests on evidence of active management, not on the client's compliance outcome — a TM who chased consistently and documented it has a materially different position than one who didn't ask at all, regardless of what the client eventually provided
- TM Express should therefore log and be able to show: every request sent, every chase, every reply, and every escalation — as the TM's own audit trail, separate from the client's Green/Amber/Red badge

**Why both matter:** a client showing Red doesn't necessarily mean the TM is exposed — if the chase log shows requests sent on schedule and escalated appropriately, that's the TM discharging their duty. The dashboard should make this distinction visible at a glance rather than collapsing it into a single status.

## 4. Email connection model

TMs won't all be on Gmail/Outlook — some run custom-domain mailboxes on their own mail server (e.g. IMAP/SMTP via a host like `mail.transport-managers.com`), so TM Express needs two connection paths:

| Provider type | Auth model | Notes |
|---|---|---|
| Gmail / Outlook | OAuth | No password ever touches TM Express; standard, most secure path |
| Custom domain / other IMAP-SMTP host | Host, port, username, password | Password stored encrypted at rest; TM should use a dedicated app-specific password, not their everyday one |

**Security requirements for the IMAP/SMTP path:**
- Credentials entered directly into TM Express's own secure setup form — never emailed, chatted, or logged in plaintext anywhere
- Encrypted at rest, scoped so only that TM's account/session can decrypt it
- IMAP over SSL (port 993) for inbound, SMTP over SSL (port 465) for outbound, matching standard secure mail config
- A visible way for the TM to revoke/rotate the connection without needing support intervention

## 5. Email as the primary contact channel

The TM's own inbox (Gmail or any provider) is the main channel for both directions:
- **Outbound:** recurring compliance requests to the client, sent from the TM's own address so replies land in the same thread
- **Inbound:** the client (or maintenance providers, drivers, etc.) replies with documents attached — PMI certificates, brake test results, infringement reports, licence copies

**What TM Express needs to do with inbound email:**
- Monitor the TM's connected inbox for messages from known client/contact addresses
- Extract attachments and file them against the right client/vehicle/driver record
- Parse what it can from the email body (e.g. "brake test booked for the 14th" → update the due-date tracker) and flag anything it can't confidently parse for manual review
- Match replies to the open chase they're responding to, so the 3-day cycle knows to stop chasing

### Client email matching model
- **Default: domain matching.** Most clients email from their own company domain (`@falconfast.co.uk`, etc.), so any address on that domain is auto-matched to the client with no setup needed
- **Exception: generic providers (Gmail, Hotmail, Outlook.com, etc.).** These can't be domain-matched — a Gmail address doesn't identify which company it belongs to. For these, the TM manually adds the specific address to the client record during setup, and TM Express treats it as a fixed one-off mapping rather than trying to infer it
- **Manual oversight view:** for every client, the TM can see exactly which addresses are currently mapped to them (both auto-matched domain and manually-added generic addresses) and add/remove entries at any time — this is the safety net for the generic-provider case and for catching a misassigned address before it causes a filing error

## 6. Document storage
- Documents are stored per client, tagged by type (PMI, brake test, MOT, VED, insurance, licence check, CPC, infringement report) and per vehicle/driver where applicable
- Each document links back to the compliance event it satisfies, so "is this vehicle compliant right now" is answerable from stored evidence, not just a due-date field
- Retention: documents kept for a minimum of the DVSA 3-year OCRS lookback window, since that's the period DVSA itself scores against — no document relevant to that window should be purged
- **Audit-ready view:** alongside the full document archive, TM Express maintains a single always-current view per client — the latest valid document of each required type (current PMI, current MOT, current VED, current insurance, current driver licence checks, current brake test record) — so a surprise DVSA/TC audit can be answered in one screen rather than searching the full history
- **Freshness flagging:** TM Express checks each required document type against its DVSA-mandated validity/interval (PMI inspection interval, 4-per-year laden brake test or EBPMS cadence, MOT/VED expiry, insurance expiry, driver licence check interval) and flags anything outdated or missing with a "chase this" prompt to the TM — this feeds directly into the client's Green/Amber/Red status and the 3-day chase cycle, rather than sitting as a separate silent check
- **Data record vs. document evidence:** knowing a fact (a client's spreadsheet or email stating a driver's licence details) is not the same as holding the document DVSA/TC actually wants to see (the scanned licence itself). For any document type requiring visual verification — driving licence, eyesight certificate, ID — the related todo stays open until an actual scan/photo file is on record, even if the underlying data has already been supplied by other means. Data-only responses can be logged as a partial update, but they don't resolve the todo.

## 7. Compliance monitoring (carried over from earlier spec, now sitting on this input model)
- PMI/brake test/MOT/VED/insurance due-date tracking per vehicle
- 3-day chase cycle with polite/urgent variants
- Monthly depot visit tracking, with the TM's own raw notes entered manually
- OCRS monitoring via VOL (read-only pull, band movement alerts)
- Driver licence/CPC status tracking
- 4-per-year laden brake test (or EBPMS) cadence per vehicle

## 8. Todo list (central anomaly queue)

Every anomaly TM Express detects — a missing document, an overdue freshness check, a pending onboarding step, an overdue depot visit, an OCRS band movement, an unresolved infringement — lands as a single item in a todo list, rather than being scattered across separate alerts or screens. This is the TM's actual day-to-day working surface.

**Behaviour:**
- Every flag source feeds the same todo list: document freshness checks (section 6), onboarding steps (section 1), depot visit due dates (section 3/7), OCRS movement (section 7), unresolved infringements
- Each todo item has one of two resolution actions, available directly from the item:
  - **Chase** — sends the compliance request email to the client (draft-for-review per the earlier autonomous/draft split, at least until Phase 3 chase automation is proven)
  - **Enter/upload manually** — the TM supplies the missing info or document directly, for anything that isn't going to arrive by email
- When the underlying anomaly is resolved (document received and matching what was missing, visit logged, onboarding step completed), the item disappears from the list automatically — no manual dismissal needed
- **Two views:** per-client (a simple column on that client's page — the anomalies specific to them) and an all-clients view (every open item across the whole book, for a TM scanning what needs attention today)

**Why this matters for the TM conduct record (section 3):** the todo list, combined with its resolution log (chased on X, resolved on Y), doubles as the audit trail showing continuous and effective management — so it's not just a working list, it's evidence.

## 9. In-app help for every manual entry point

Anything that can't be automated (no API, no email trail) still needs to happen inside TM Express — but the TM shouldn't have to remember from memory where each piece of information lives. Every manual field carries an inline explanation and, where relevant, a direct link to the source system.

| Manual entry point | Where to find it | In-app explanation |
|---|---|---|
| VOL disclosure form submission status | `vehicle-operator-licensing.service.gov.uk/auth/login` | "Submit the hours/vehicle disclosure on VOL directly — TM Express can't submit this for you. Once DVLA responds, update the status here." |
| DVLA onboarding email details (company name, application number) | The TM's own inbox — auto-detected, but confirm manually if the parser misses anything | "These details come from DVLA's 'You've been named as a Transport Manager' email." |
| OCRS scores (roadworthiness, traffic) | VOL → "Your DVSA Operator Reports" → "View your current OCRS" | "Recalculated weekly by DVSA. Check monthly and enter what you see here — TM Express tracks the trend and flags any band movement for you." |
| PMI / brake test / MOT / VED / insurance valid-until dates | The document itself, once received | "Enter the date this document is valid until, based on the certificate or record you received." |
| Depot visit log | Your own on-site visit | "Log date, findings, and any actions agreed. This is your evidence of continuous and effective management — see the DVSA Guide to Maintaining Roadworthiness for what to check." (link to the current DVSA guidance PDF) |
| Driver licence scan/photo | DVLA licence check service, or requested directly from the client | "A data record (e.g. a spreadsheet of licence numbers) isn't enough — DVSA/TC expects the actual scanned document on file." |
| Brake test cadence (4/year laden, or EBPMS) | The client's maintenance provider | "DVSA requires four laden brake tests per year at 65%+ of design axle weight, unless the vehicle uses an approved EBPMS system." |

This table isn't exhaustive — as new manual fields get added during the build, each one should get the same treatment: a one-line explanation of what's expected, and a link to the source system if an external one exists.

---

## Multi-tenant structure
- Each TM has their own account, their own connected inbox, and their own client roster
- Each client belongs to exactly one TM at a time (matching the DVLA "genuine link" requirement — a TM can't casually double-manage without the hours disclosure reflecting it)
- Shared underlying engine (email parsing, chase cadence, compliance tracking) — but no TM sees another TM's clients or documents

---

## Phase 1 build plan — data model + manual portal

### Data model
- **Client** — company name, OL number, contact name/email, onboarding status (pending DVLA / approved), compliance status (Green/Amber/Red — computed, not stored)
- **Vehicle** — registration, type, client, PMI due date, brake test due date (or EBPMS flag), MOT due date, VED due date, insurance due date
- **Driver** — name, client, licence check due date, CPC due date
- **Document** — type (PMI, brake test, MOT, VED, insurance, licence check, CPC, infringement report, depot visit note, other), client, linked vehicle or driver (nullable), file, upload date, valid-until date (set manually at upload, or computed from type + DVSA interval where fixed)
- **Depot visit** — client, date, findings, actions agreed, owner, follow-up status
- **Todo** — auto-generated: type (missing doc, overdue doc, visit overdue), client, linked vehicle/driver/visit, status (open/resolved), created date, resolved date

### Screens
1. All-clients dashboard — sections (client onboarding, last visit logged, last PMI received, last brake test received, drivers list), header dropdown to filter to one client, matching the wireframes above
2. Todo tab (mobile) / column (desktop) — same todo items, Chase-or-Upload actions (Chase stays inert/disabled in Phase 1 with no email yet — just Upload/mark-resolved works)
3. Client detail page — vehicle list, driver list, document list, visit log, all scoped to that client
4. Add/edit forms: client, vehicle, driver
5. Document upload form — file, type, linked vehicle/driver, valid-until date
6. Depot visit log entry form
7. Audit-ready view per client — latest valid document per required type, one screen

### Suggested build order
1. Client CRUD + all-clients list
2. Vehicle CRUD nested under a client
3. Driver CRUD nested under a client
4. Document upload + tagging (type, linked vehicle/driver, valid-until)
5. Due-date/freshness logic — compute each document type's status against its DVSA interval, roll up to client Green/Amber/Red
6. Todo auto-generation from the freshness logic and visit-due tracking
7. Depot visit log entry, feeding the "last visit logged" section and visit-due flagging
8. Dashboard assembly — grouped sections + client filter dropdown
9. Todo tab/column view, wired to the same todo data
10. Inline help text + source links on every manual field (section 9), attached as each field is built rather than bolted on at the end

### Deliberately out of scope for Phase 1
- Any email integration (parsing, chasing, onboarding detection) — todo items exist, but "Chase" has nowhere to send yet
- VOL/OCRS pull — read manually and enter as a note for now if needed
- DVLA onboarding automation — the client's onboarding status is a manual field you update yourself
- Multi-tenant — build for your own single account first

This phase is done when you'd genuinely stop opening Aquarius and use this instead for your day-to-day client and vehicle compliance tracking.

---

## Phase 2 build plan — OCRS tracking

Most of what was originally scoped for Phase 2 (Green/Amber/Red logic, freshness checks, the audit-ready view) is already delivered in Phase 1, since the dashboard and todo list needed it. What's left for Phase 2 is specifically OCRS: logging your clients' DVSA risk scores over time and catching band movement before it surprises you.

**Note on automation:** VOL doesn't expose a public API for OCRS, the same way it doesn't for onboarding submissions — so this can't be an automated pull. It's you logging into VOL yourself (monthly, per the earlier cadence) and entering what you see into TM Express, which then does the tracking and flagging on top of that manual input.

### Data model additions
- **OCRS score** — client, date recorded, roadworthiness score, traffic score, band (Green/Amber/Red/Grey/Blue), entered by the TM

### Screens
1. OCRS entry form per client — date, roadworthiness score, traffic score (band can be computed from the scores, or entered directly if you're just copying what VOL shows)
2. OCRS history view per client — a simple table or trend of past entries, so you can see direction of travel, not just the latest snapshot
3. A new dashboard section, "OCRS status," alongside the existing ones (onboarding, visits, PMI, brake test, drivers) — showing each client's current band and highlighting any that moved since last entry

### Build order
1. OCRS score data model + entry form
2. History view per client
3. Band-movement detection — compare each new entry to the previous one, flag if roadworthiness, traffic, or the combined band worsened
4. Todo item generation on band movement — feeds into the existing todo list (section 8), not a separate alert system
5. Dashboard section for OCRS, following the same pattern as the other sections

### Deliberately out of scope for Phase 2
- Any automated VOL login/scrape — not something to build toward, same reasoning as onboarding
- Predictive scoring or trend forecasting — just tracking and flagging actual entries, nothing speculative

This phase is done when you have a running record of each client's OCRS history in TM Express, and a band worsening shows up as a todo item the same way an overdue document does.

---

## Phase 3 build plan — chase cycle (draft-only)

No email integration yet — that's Phase 4. Phase 3 makes the "Chase" button on a todo item actually do something useful: generate the right draft text on the right cadence, which you then manually copy into your own email client and send. This validates the wording and the 3-day cadence against real client responses before any of it is trusted to run on its own.

### Data model additions
- **Chase** — linked todo item, variant (polite/urgent), draft text generated, date generated, date manually confirmed sent, response status (no response / replied / resolved)
- Extend **Todo** with: last chased date, next chase due date (chased date + 3 days), escalation level (starts polite, escalates to urgent after N unanswered chases — confirm N, e.g. 2)

### Screens
1. Chase draft view — opened from a todo item's "Chase" action, shows the generated draft (polite or urgent, based on escalation level), editable before you copy it out
2. "Mark as sent" action — confirms you've actually sent it via your own email client, which resets the 3-day countdown and logs the chase
3. Chase history per todo item / per client — every chase sent, when, which variant, and whether it led to resolution
4. Todo item now shows "next chase due" alongside its existing status, so the dashboard reflects the cadence, not just the underlying anomaly

### Build order
1. Draft templates per todo type (missing PMI, missing brake test, missing driver document, overdue depot visit, etc.) — polite and urgent variants for each
2. Template population — pull in the actual client name, vehicle reg, document type, and how many days overdue, so drafts read as specific, not generic
3. 3-day cadence tracking — compute next-due date from last-chased date, surface it on the todo item
4. Escalation logic — after a defined number of unanswered chases, switch template variant from polite to urgent
5. "Mark as sent" and "mark as replied/resolved" actions, updating the chase and todo records
6. Chase history view, feeding the audit trail from section 3 (TM conduct record) — this is the evidence trail that matters most if anything is ever questioned
7. Wire the real "Chase" button into the todo list (section 8), replacing the disabled placeholder from Phase 1

### Deliberately out of scope for Phase 3
- Actually sending the email automatically — still copy-paste into your own client, since there's no inbox connection yet
- Detecting a client's reply automatically — that requires reading the inbox, which is Phase 4. For now, you mark a chase as "replied" yourself once you see the response
- Multi-channel chasing (SMS, phone call logging) — email drafts only

This phase is done when every todo item shows an accurate "next chase due," generates a draft that's actually usable without heavy editing, and escalates to urgent tone appropriately — proven with real PR PROTRANS-style chases before Phase 4 automates the sending and reply-matching around it.
