export interface TemplateLineItem {
  category: string
  description: string
  qty: number
  unit: string
  unit_price: number
  type: 'one_time' | 'recurring'
  discount_pct: number
  tax_pct?: number
}

export interface QuotationTemplateDefaults {
  title: string
  currency: string
  tax_pct: number
  intro: string
  terms: string
  scope: string
  modules: Array<{ title: string; icon: string; items: string[] }>
  notes: string
  line_items: TemplateLineItem[]
}

export interface QuotationTemplate {
  id: string
  name: string
  description: string
  defaults: QuotationTemplateDefaults | null
}

const lims: QuotationTemplateDefaults = {
  title: 'AIVOA LIMS Enterprise Suite — Commercial Proposal',
  currency: 'INR',
  tax_pct: 18,
  intro:
    '<p>Architected for <b>zero regulatory gaps &amp; high-throughput</b>, the AIVOA LIMS Enterprise Suite delivers a modern, high-performance foundation for pharmaceutical, medical device, and contract testing environments.</p>' +
    '<p>Designed to eliminate manual transcriptions and regulatory risk, it seamlessly bridges laboratory testing execution, asset availability, dynamic client specifications, and electronic compliance (21 CFR Part 11, EU Annex 11).</p>',
  terms:
    '<p><b>Payment Terms &amp; Delivery Commitment</b></p>' +
    '<ul><li>50% advance along with Official Purchase Order (PO)</li>' +
    '<li>40% upon completion of User Acceptance Testing (UAT)</li>' +
    '<li>10% upon Final System Go-Live &amp; Sign-off</li></ul>' +
    '<p>Environment setup within 5 business days from PO; target Go-Live in 30 days from kickoff. One-time fee exclusive of applicable GST (18%).</p>',
  scope: '',
  modules: [
    {
      title: 'Sample & Master Data Management',
      icon: 'database',
      items: [
        'Multi-Sponsor/Dynamic Specs',
        'Sample Inwarding & Chain of Custody',
        'Stability & Retention Tracking',
        'Barcode & Labeling',
      ],
    },
    {
      title: 'Laboratory Execution & Workflows',
      icon: 'flask',
      items: [
        'Hierarchical Task Allocation',
        'Separate ATR & CoA Generation',
        'Automated OOS/OOT Workflows',
        'Maker/Checker Approval Engine',
      ],
    },
    {
      title: 'Reagents & NPM Inventory',
      icon: 'box',
      items: [
        'Reference & Working Standards',
        'Volumetric Solutions & Media',
        'NPM Quality Control',
      ],
    },
    {
      title: 'Equipment & Facility Mapping',
      icon: 'settings',
      items: [
        'Shared Asset Master',
        'Hard Calibration System Lockouts',
        'Facility & Environmental Mapping',
      ],
    },
    {
      title: 'Compliance & CSV Enablers',
      icon: 'shield',
      items: [
        '21 CFR Part 11 & EU Annex 11',
        'GAMP 5 Validation Package',
        'Role-Based Security',
      ],
    },
    {
      title: 'AI & Intelligent Automation',
      icon: 'cpu',
      items: [
        'Vision AI Vendor Label Scanner ✨ AI',
        'AI CoA Drafting ✨ AI',
        'Analytical Trend & Anomaly Detection ✨ AI',
      ],
    },
  ],
  notes: '',
  line_items: [
    {
      category: 'Implementation',
      description: 'Implementation, Configuration & CSV Validation (up to 50 users)',
      qty: 1,
      unit: 'project',
      unit_price: 200000,
      type: 'one_time',
      discount_pct: 0,
    },
    {
      category: 'Subscription',
      description: 'Annual SaaS Subscription — AIVOA Cloud LIMS (50 users)',
      qty: 1,
      unit: 'year',
      unit_price: 300000,
      type: 'recurring',
      discount_pct: 0,
    },
  ],
}

const globalQms: QuotationTemplateDefaults = {
  title: 'AIVOA QMS Global Enterprise — Commercial Proposal',
  currency: 'USD',
  tax_pct: 0,
  intro:
    '<p>Architected for <b>global regulatory harmonization &amp; zero-defect data integrity</b>, the AIVOA QMS Global Enterprise Suite is precision-engineered for US FDA &amp; EU regulatory adherence.</p>' +
    '<p>By natively embedding ALCOA+ principles and proprietary AI, the platform eliminates compliance blind spots, guarantees immutable audit trails, and provides real-time oversight for MHRA, FDA, and EMA inspections.</p>',
  terms:
    '<p><b>Payment Terms &amp; Delivery Commitment</b></p>' +
    '<ul><li>50% advance upon execution of Official Purchase Order</li>' +
    '<li>40% milestone payment upon completion of Validation/UAT</li>' +
    '<li>10% final payment upon Production Environment Go-Live sign-off</li></ul>' +
    '<p>Target Go-Live is 45–60 days from kickoff (dependent on client data readiness). Annual SaaS billed 100% in advance prior to Go-Live.</p>',
  scope: '',
  modules: [
    {
      title: 'Global Compliance & CSV',
      icon: 'shield',
      items: [
        'Native 21 CFR Part 11 & EU Annex 11 E-Signatures',
        'Immutable Field-Level Audit Trails (ALCOA+)',
        'GAMP 5 Category 4 CSV Validation Package',
        'AI Compliance Copilot (SOP/Guideline Chat) ✨ AI',
      ],
    },
    {
      title: 'eQMS (Quality Events)',
      icon: 'alert',
      items: [
        'Global CAPA, Deviations & RCA Workflows',
        'OOS/OOT & Market Complaint Investigations',
        'ICH Q9 Risk Assessment Framework',
        'End-to-End Investigation Auto-Drafting ✨ AI',
      ],
    },
    {
      title: 'Global DMS Architecture',
      icon: 'document',
      items: [
        'Multi-Site Document Architecture & Routing',
        'Automated Periodic Review & Expiry Tracking',
        'Controlled Copy Tracking & Watermarking',
        'Auto-Draft SOPs from Templates ✨ AI',
      ],
    },
    {
      title: 'Training & Competency',
      icon: 'users',
      items: [
        'Automated Read & Understand (Linked to DMS)',
        'Role-Based Training Matrix & Certification',
        'Audit-Ready Individual Training Records',
        'AI Quiz & Comprehension Generator ✨ AI',
      ],
    },
    {
      title: 'Supplier & Audit Mgmt',
      icon: 'truck',
      items: [
        'Approved Supplier List (ASL) & Material Qual.',
        'Regulatory Vendor Site Audit Scheduling',
        'Supplier Corrective Action Requests (SCAR)',
        'Internal Audit & Inspection Readiness Tracking',
      ],
    },
    {
      title: 'eBMR & Product Data',
      icon: 'clipboard',
      items: [
        'ISA-88 Standard Master Batch Records (MBR)',
        'Automated Batch Disposition & Release Workflows',
        'Automated COA (Certificate of Analysis) Gen.',
        'AI-Generated APQR Analytics ✨ AI',
      ],
    },
  ],
  notes: '',
  line_items: [
    {
      category: 'Implementation',
      description: 'Enterprise Deployment & GAMP 5 CSV Validation (up to 100 users)',
      qty: 1,
      unit: 'project',
      unit_price: 8500,
      type: 'one_time',
      discount_pct: 0,
    },
    {
      category: 'Subscription',
      description: 'Global SaaS License (up to 100 users)',
      qty: 1,
      unit: 'year',
      unit_price: 12000,
      type: 'recurring',
      discount_pct: 0,
    },
  ],
}

const domesticQms: QuotationTemplateDefaults = {
  title: 'AIVOA QMS Domestic Suite — Commercial Proposal',
  currency: 'INR',
  tax_pct: 18,
  intro:
    '<p>Architected for <b>continuous audit readiness &amp; Schedule M compliance</b>, the AIVOA QMS Domestic Suite provides a robust digital foundation for life sciences manufacturing.</p>' +
    '<p>It eliminates paper-based inefficiencies, ensures complete traceability, and seamlessly manages deviations, change controls, and document lifecycles — keeping your facility continuously audit-ready.</p>',
  terms:
    '<p><b>Payment Terms &amp; Delivery Commitment</b></p>' +
    '<ul><li>50% advance along with Official Purchase Order (PO)</li>' +
    '<li>40% upon completion of User Acceptance Testing (UAT)</li>' +
    '<li>10% upon Final System Go-Live &amp; Sign-off</li></ul>' +
    '<p>Target Go-Live: 30 days from kickoff. Annual SaaS billed 100% in advance prior to Go-Live. Exclusive of applicable GST (18%).</p>',
  scope: '',
  modules: [
    {
      title: 'Document Management (DMS)',
      icon: 'document',
      items: [
        'Core Document Control & Versioning',
        'Review, Approval & Routing Matrix',
        'Controlled / Uncontrolled Print (Watermarks)',
        'Document Compliance Check ✨ AI',
      ],
    },
    {
      title: 'Quality Events (eQMS)',
      icon: 'alert',
      items: [
        'Deviations, NC & Root Cause Analysis',
        'CAPA & Change Control Workflows',
        'Market Complaints & Product Recalls',
        'Form & Template Builder ✨ AI',
      ],
    },
    {
      title: 'eMBR & Product Data',
      icon: 'clipboard',
      items: [
        'Full Item Master, Specs & Recipes (BOM)',
        'ISA-88 Standard MBR Builder',
        'Batch Issuance & QA Disposition Workflow',
        'BMR Template Validation ✨ AI',
      ],
    },
    {
      title: 'Supplier Management',
      icon: 'truck',
      items: [
        'Vendor Master & Approved Supplier List (ASL)',
        'Vendor Site Qualification & Audits',
        'Supplier Corrective Action Requests (SCAR)',
        'Vendor Performance Tracking',
      ],
    },
    {
      title: 'Equipment & Asset Mgmt',
      icon: 'settings',
      items: [
        'Maintenance & Calibration Scheduler',
        'Equipment Qualification (IQ/OQ/PQ)',
        'Hard Calibration System Lockouts',
        'Paper-to-Digital eLog Book Entry ✨ AI',
      ],
    },
    {
      title: 'Compliance & Validation',
      icon: 'shield',
      items: [
        'Schedule M / 21 CFR Audit Trail & E-Signatures',
        'CSV Validation Package (URS, FRS, IQ/OQ)',
        'Secure Cloud Hosting (AWS/Azure India)',
        'AI Compliance Copilot (Chat) ✨ AI',
      ],
    },
  ],
  notes: '',
  line_items: [
    {
      category: 'Implementation',
      description: 'Domestic System Configuration & Training (up to 50 users)',
      qty: 1,
      unit: 'project',
      unit_price: 200000,
      type: 'one_time',
      discount_pct: 0,
    },
    {
      category: 'Subscription',
      description: 'Annual SaaS Subscription (up to 50 users)',
      qty: 1,
      unit: 'year',
      unit_price: 300000,
      type: 'recurring',
      discount_pct: 0,
    },
  ],
}

export const QUOTATION_TEMPLATES: QuotationTemplate[] = [
  {
    id: 'custom',
    name: 'Custom (blank)',
    description: 'Start from a blank proposal — our standard model.',
    defaults: null,
  },
  {
    id: 'lims',
    name: 'LIMS — AIVOA LIMS Enterprise Suite',
    description: 'Lab Information Management proposal (INR, 50 users).',
    defaults: lims,
  },
  {
    id: 'global-qms',
    name: 'Global QMS — US FDA / EU Edition',
    description: 'Global enterprise QMS proposal (USD, up to 100 users).',
    defaults: globalQms,
  },
  {
    id: 'domestic-qms',
    name: 'Domestic QMS — Schedule M Edition',
    description: 'Domestic compliance QMS proposal (INR, up to 50 users).',
    defaults: domesticQms,
  },
]

export function getTemplate(id: string): QuotationTemplate | undefined {
  return QUOTATION_TEMPLATES.find((t) => t.id === id)
}
