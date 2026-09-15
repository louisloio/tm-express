# PR PROTRANS LTD — seed data (extracted from Gmail label "ForClaudeOnly")

Extracted from 7 forwarded email threads with Piotr (PR PROTRANS office) and Capital Vehicle Maintenance (the maintenance provider). This is ready to hand to Claude Code as the real seed data for the Phase 1 client record.

## ⚠️ Needs your confirmation before seeding
1. **OL number conflict** — you gave me **OF2068326** earlier, but the "Request for O Licence Documentation" email references **OK2049916**. These don't match. Which one is correct? (Possible: one is a typo, or OK2049916 belongs to a different/older application.)
2. **Driver identity unclear** — the eyesight/fit-to-drive documents are named with initials "GI" (Eyes check GI, Fit to Drive GI) but the eyesight check sheet itself is named "AS". Is this one driver going by both, or two different drivers? None of the threads name the driver directly.
3. Several dates below are already in the past relative to today (15 Sep 2026) — e.g. MOT due 30.06.25, VED due 1 Dec 2025. Worth confirming whether these have since been renewed (and you just haven't forwarded the newer doc) before they seed as "overdue" in a fresh system.

## Client
- **Company:** PR PROTRANS LTD
- **Company number:** 12338165
- **VAT:** 343 0958 02
- **Address:** 128 Amyand Park Road, Twickenham, TW1 3HP
- **Phone:** 07383017550
- **Website:** prprotrans.co.uk
- **OL number:** OF2068326 or OK2049916 — see open question above
- **Operating centre:** Plot 13, Court Lane Industrial Estate, Court Lane, Iver, SL0 9HL — 3 vehicles, 2 trailers
- **Main contact:** Piotr — office@prprotrans.co.uk
- **Maintenance provider:** Capital Vehicle Maintenance — Yashar Shahbazi, compliance@cvmltd.co.uk, 0208 758 0888

## Vehicles

### FN68 HWJ
- PMI records on file: 23.08.25, 21.03.2026, 01.05.2026 (most recent)
- Brake test records on file: 28.09.25, 21.03.2026, 05.05.2026 (most recent)
- MOT: last recorded 03.06.25, due date noted as 30.06.25
- VED (tax): due date noted as 1 December 2025
- Tacho calibration certificate: dated to 26.06.26

### BN68 GLF
- PMI records on file: 13.03.2026, 24.05.2026 (most recent)
- Brake test records on file: 13.03.2026, 25.04.2026 (most recent)
- Tachograph calibration: certificate dated 09 Jun 2028

### MV74FEP
- PMI record on file: 06.05.2026
- LOLER test (lifting equipment — suggests this vehicle has a tail lift or crane): dated 05.2026

## Driver documents on file (identity unconfirmed — see above)
- Eyesight check certificate
- Fit to drive certificate
- Eyesight check sheet
- Still outstanding per the original welcome request: driver licence, tacho card, driver CPC card, driver NI number, insurance documents

## Driver: Charles Okura (added 29 Feb 2024)
- NI number: JA 63 19 71 D
- DOB: 16.08.1965
- Address: 42 Hawkins Road, London, NW10 9DF
- Driving licence was pending at the time of this email — status unconfirmed since
- On file: ID document, eyesight check certificate

## Driver licence check — data received, scan still needed (17 Dec 2024)
Piotr sent a spreadsheet ("Driving Licence check.xlsx") with driver licence details, but per your note, the actual scan/photo of the licence itself is still required — the spreadsheet data alone doesn't satisfy the document requirement. This is now reflected in the platform spec: a licence-check todo only resolves when the scanned document is on file, not when the data is merely supplied.

## Other documents on file
- Daily defect report (Oct 2025)
- Motor insurance certificate (2025)

## Confirmed working pattern (useful as your actual chase template)
Your 20 Apr 2026 email to Piotr is a real example of the compliance-request pattern to replicate in TM Express: flagging the 6-week PMI/brake test cycle approaching for all three vehicles at once, naming each registration, and asking for booking + return of completed records. Worth using as the template tone for the "Chase" draft-email feature once email integration is built.
