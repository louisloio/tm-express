import type { InfringementCategory } from '../types/database'

// Spec section 6 — fixed category -> type taxonomy, each type tagged with
// which entity/entities it links to.
export const INFRINGEMENT_TAXONOMY: Record<
  InfringementCategory,
  { types: string[]; linksTo: 'driver' | 'vehicle' | 'both' | 'client' }
> = {
  'Driver Hours & Tachograph': {
    linksTo: 'driver',
    types: [
      'Daily Driving Excess',
      'Continuous Driving Excess',
      'Insufficient Daily Rest',
      'Insufficient Weekly Rest',
      'Missing Tachograph Card Data',
      'Driving Without Card',
      'Mode Switch Errors',
    ],
  },
  'Vehicle Roadworthiness & Maintenance': {
    linksTo: 'vehicle',
    types: [
      'Overdue PMI',
      'Expired MOT',
      'Missing Vehicle Unit (VU) Download',
      'Overdue Rolling Road Brake Test',
      'Unresolved Safety Defect',
      'Active PG9 Prohibition Notice',
    ],
  },
  'Operational Loading & Weight': {
    linksTo: 'both',
    types: ['Gross Vehicle Weight Overload', 'Axle Weight Overload', 'Insecure Load'],
  },
  'Licence & Operator Infrastructure': {
    linksTo: 'client',
    types: [
      'Operating Centre Breach',
      'Fleet Limit Excess (Over-fleeting)',
      'Expired Operator Insurance',
      'Overdue Driver Licence Check',
      'Expired Driver CPC',
    ],
  },
}

export const INFRINGEMENT_CATEGORIES = Object.keys(
  INFRINGEMENT_TAXONOMY,
) as InfringementCategory[]
