# TM Express — Seed data from Figma prototype

Placeholder content already used across the Figma mockups (Dashboard, Todo, CompanyPage, EmailChase). Using this as the seed keeps the app's first real-feeling test data consistent with what the design was built around.

## Clients

| Company | OL number | Onboarding status |
|---|---|---|
| Acme Haulage Ltd | OF1234567 | Approved |
| Coastal Freight Solutions | OF7654321 | Approved |
| Meridian Logistics Group | -- | In Progress |
| Northbridge Transport | OF2223344 | Approved |

## Vehicles (from todo item mockups)
Registrations referenced across Acme Haulage Ltd and Coastal Freight Solutions:
- AB19 CDE
- CF15 UVW
- CF17 RST
- CF18 LMN

## Drivers (from todo item mockups)
- Jamie Fox
- Priya Nair
- Morgan Lee
- Taylor Reed

## Todo items shown in the Figma prototype
These map directly onto the todo taxonomy (Overdue Document / Missing Document / Visit Overdue) and are good seed rows to exercise the todo list, since they already exist as designed examples:

**Overdue Document**
- AB19 CDE: MOT overdue
- CF15 UVW: Brake test overdue
- CF15 UVW: VED overdue
- CF17 RST: Brake test overdue
- CF15 UVW: MOT overdue
- CF15 UVW: PMI overdue
- Priya Nair: Licence check overdue
- Morgan Lee: Licence check overdue
- Morgan Lee: CPC overdue
- CF15 UVW: Insurance overdue

**Missing Document**
- Acme Haulage Ltd: Insurance missing
- CF18 LMN: PMI missing
- CF18 LMN: Brake test missing
- CF17 RST: VED missing
- Jamie Fox: Licence check missing
- Jamie Fox: CPC missing
- CF17 RST: PMI missing
- Taylor Reed: CPC missing
- CF18 LMN: MOT missing
- CF18 LMN: VED missing

**Visit Overdue**
- Coastal Freight Solutions: Site Visit Overdue or Missing

## Document type taxonomy (from VehiculePage / CompanyPage mockups)
PMI · Brake test · MOT · VED · Insurance · Licence check · CPC · Infringement report · Depot visit note · Other

## Not in the Figma mockups — invented below (clearly placeholder, not real)

### Client contacts, addresses & operating centres

| Company | Contact email | Address | Operating centre |
|---|---|---|---|
| Acme Haulage Ltd | ops@acmehaulage.co.uk | 14 Bridgewater Road, Leeds, LS9 2AA | Whitehall Industrial Park, Leeds, LS12 6EF |
| Coastal Freight Solutions | admin@coastalfreight.co.uk | 22 Harbour View, Plymouth, PL1 3DE | Estover Trading Estate, Plymouth, PL6 7PY |
| Meridian Logistics Group | contact@meridianlogistics.co.uk | 7 Meridian House, Birmingham, B4 6AT | Aston Cross Business Park, Birmingham, B6 5RQ |
| Northbridge Transport | fleet@northbridgetransport.co.uk | 3 Northbridge Way, Manchester, M17 1FQ | Trafford Park Depot, Manchester, M17 1EH |

### Vehicle-to-client mapping (inferred from the OL prefixes already used)
- Acme Haulage Ltd: AB19 CDE
- Coastal Freight Solutions: CF15 UVW, CF17 RST, CF18 LMN

### Driver-to-client mapping (inferred from which company's todo rows they appear under)
- Coastal Freight Solutions: Jamie Fox, Priya Nair, Morgan Lee, Taylor Reed

### Sample dates (today taken as 22 Sep 2026 for consistency)
- AB19 CDE MOT: expired 28 Aug 2026, reminder was set for 14 days before
- CF15 UVW brake test: expired 10 Sep 2026, reminder 7 days before
- CF15 UVW VED: expired 5 Sep 2026, reminder 14 days before
- CF17 RST brake test: expired 15 Sep 2026, reminder 7 days before
- CF15 UVW MOT: expired 1 Sep 2026, reminder 14 days before
- CF15 UVW PMI: expired 18 Sep 2026, reminder 7 days before
- Priya Nair licence check: expired 30 Aug 2026, reminder 30 days before
- Morgan Lee licence check: expired 12 Sep 2026, reminder 30 days before
- Morgan Lee CPC: expired 20 Aug 2026, reminder 60 days before
- CF15 UVW insurance: expired 8 Sep 2026, reminder 14 days before
- Coastal Freight Solutions last visit: 18 Aug 2026 (35 days ago — overdue against the monthly cadence)

### Sample infringement records (one per taxonomy category, to exercise the section)
| Client | Category | Type | Linked to | Date | Resolved |
|---|---|---|---|---|---|
| Coastal Freight Solutions | Driver Hours & Tachograph | Insufficient Weekly Rest | Priya Nair | 2 Sep 2026 | No |
| Coastal Freight Solutions | Vehicle Roadworthiness | Unresolved Safety Defect | CF17 RST | 10 Sep 2026 | No |
| Acme Haulage Ltd | Operational Loading & Weight | Axle Weight Overload | AB19 CDE + (driver TBC) | 5 Sep 2026 | Yes |
| Northbridge Transport | Licence & Operator Infrastructure | Overdue Driver Licence Check | -- (client-level) | 15 Aug 2026 | No |

This is placeholder/design data, not real client information — safe to seed freely without the privacy considerations that applied to the PR PROTRANS email data.
