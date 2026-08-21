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
  modules: Array<{ title: string; icon: string; category?: string; items: { title: string; description?: string }[] }>
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
  title: 'AIVOA LIMS Enterprise Suite Proposal',
  currency: 'INR',
  tax_pct: 18,
  intro:
    '<p>Architected for <b>Zero Regulatory Gaps &amp; High Throughput</b>, the AIVOA LIMS Enterprise Suite delivers a modern, high-performance architectural foundation for pharmaceutical, medical device, and contract testing environments.</p>' +
    '<p>Designed to eliminate manual transcriptions and regulatory risks, it seamlessly bridges laboratory testing execution, asset availability, dynamic client specifications, and electronic compliance.</p>',
  terms:
    '<p><b>Payment Terms &amp; Delivery Commitment</b></p>' +
    '<ul><li>50% advance along with Official Purchase Order (PO)</li>' +
    '<li>40% upon completion of User Acceptance Testing (UAT)</li>' +
    '<li>10% upon Final System Go-Live &amp; Sign-off</li></ul>' +
    '<p>One-time fee exclusive of applicable GST (18%). Environment setup within 5 business days from PO; User Training &amp; Data Load in weeks 2–3; UAT &amp; Validation Review in week 4; target Go-Live in 30 days from kickoff.</p>',
  scope: '',
  modules: [
    {
      title: 'Sample & Master Data Management',
      icon: 'database',
      category: 'CORE',
      items: [
        { title: 'Multi-Sponsor / Dynamic Specs', description: 'Hybrid data model supporting common test parameters mapped to client-specific limits and STPs without database bloat.' },
        { title: 'Sample Inwarding & Chain of Custody', description: 'Intake verification logging package seal condition, priority TAT flags, and storage requirements.' },
        { title: 'Stability & Retention Tracking', description: 'Complete ICH Q1A stability pull tracking and automated retention sample location mapping.' },
        { title: 'Barcode & Labeling', description: 'Automated AR Number and 2D barcode generation ready for thermal printing (Zebra ZD421 compatible).' },
      ],
    },
    {
      title: 'Laboratory Execution & Workflows',
      icon: 'flask',
      category: 'CORE',
      items: [
        { title: 'Hierarchical Task Allocation', description: 'Work planner allowing Lab Managers to assign tasks by category (Chemical, Micro, Packaging) or down to specific analysts per parameter.' },
        { title: 'Separate ATR & CoA Generation', description: 'Independent Analytical Test Reports (ATRs) per department with final consolidated Certificate of Analysis release.' },
        { title: 'Automated OOS/OOT Workflows', description: 'Immediate specification breach detection with direct handoff to eQMS investigation workflows.' },
        { title: 'Maker/Checker Approval Engine', description: 'Strict dual-person verification enforcing regulatory sign-offs before batch release.' },
      ],
    },
    {
      title: 'Reagents, Standards & NPM',
      icon: 'box',
      category: 'INVENTORY',
      items: [
        { title: 'Reference & Working Standards', description: 'Expiry tracking, potency adjustment, and usage logs during result entry.' },
        { title: 'Volumetric Solutions & Media', description: 'Preparation logs, standardization records, and automated expiry locks.' },
        { title: 'NPM Quality Control', description: 'Non-Product Material testing workflows enforcing GxP change control protocols.' },
      ],
    },
    {
      title: 'Equipment & Facility Mapping',
      icon: 'settings',
      category: 'ASSETS',
      items: [
        { title: 'Shared Asset Master Engine', description: 'Real-time cross-referencing with QMS Equipment register filtering lab instruments.' },
        { title: 'Hard Calibration System Lockouts', description: 'Prevents analysts from executing tests or saving data using expired or uncalibrated instruments.' },
        { title: 'Facility & Environmental Mapping', description: 'Mapped QC Block and utility areas for environmental monitoring trend tracking.' },
      ],
    },
    {
      title: 'Compliance & CSV Enablers',
      icon: 'shield',
      category: 'ALCOA+',
      items: [
        { title: 'US FDA 21 CFR Part 11 & EU Annex 11', description: 'Immutable, field-level time-stamped audit trails with reason-for-change prompts.' },
        { title: 'CSV Validation Support Package', description: 'Pre-packaged GAMP 5 Category 4 validation templates (URS, FRS, Traceability Matrix, and IQ/OQ execution scripts) for Medtech CSV review.' },
        { title: 'Role-Based Security', description: 'Strict granular permissions across Analysts, Lab Supervisors, QA Approvers, and System Admins.' },
      ],
    },
    {
      title: 'AI & Intelligent Automation',
      icon: 'cpu',
      category: 'AI ENGINE',
      items: [
        { title: 'Vision AI Vendor Label Scanner ✨ AI', description: 'Scans vendor/sample barcodes and physical labels to auto-populate batch, product, mfg, and expiry details instantly.' },
        { title: 'AI Certificate of Analysis (CoA) Drafting ✨ AI', description: 'Automatically pulls approved test parameters into audit-proof PDF CoAs formatted to client-specific layouts.' },
        { title: 'Analytical Trend & Anomaly Detection ✨ AI', description: 'Monitors historical testing values to flag subtle instrument drift or OOT trends before failure occurs.' },
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
  title: 'AIVOA QMS Enterprise Suite — Global Compliance Edition',
  currency: 'USD',
  tax_pct: 0,
  intro:
    '<p>Architected for <b>Global Regulatory Harmonization &amp; Zero-Defect Data Integrity</b>, the AIVOA QMS Global Enterprise Suite is precision-engineered to meet the strict demands of US FDA 21 CFR Part 11, EU Annex 11, and ICH Q10 Guidelines.</p>' +
    '<p>To succeed in highly regulated export markets (US, EU, UK), organizations must demonstrate impenetrable data governance and proactive quality control. By natively embedding ALCOA+ principles and utilizing proprietary AI, the platform eliminates compliance blind spots, guarantees immutable audit trails, and provides real-time oversight for MHRA, FDA, and EMA inspections. This is not just a digitizer; it is a continuously audit-ready compliance engine.</p>',
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
        { title: 'Native 21 CFR Part 11 & EU Annex 11 E-Signatures' },
        { title: 'Immutable Field-Level Audit Trails (ALCOA+)' },
        { title: 'GAMP 5 Category 4 CSV Validation Package' },
        { title: 'AI Compliance Copilot (SOP/Guideline Chat) ✨ AI' },
      ],
    },
    {
      title: 'eQMS (Quality Events)',
      icon: 'alert',
      items: [
        { title: 'Global CAPA, Deviations & RCA Workflows' },
        { title: 'OOS/OOT & Market Complaint Investigations' },
        { title: 'ICH Q9 Risk Assessment Framework' },
        { title: 'End-to-End Investigation Auto-Drafting ✨ AI' },
      ],
    },
    {
      title: 'Global DMS Architecture',
      icon: 'document',
      items: [
        { title: 'Multi-Site Document Architecture & Routing' },
        { title: 'Automated Periodic Review & Expiry Tracking' },
        { title: 'Controlled Copy Tracking & Watermarking' },
        { title: 'Auto-Draft SOPs from Templates ✨ AI' },
      ],
    },
    {
      title: 'Training & Competency',
      icon: 'users',
      items: [
        { title: 'Automated Read & Understand (Linked to DMS)' },
        { title: 'Role-Based Training Matrix & Certification' },
        { title: 'Audit-Ready Individual Training Records' },
        { title: 'AI Quiz & Comprehension Generator ✨ AI' },
      ],
    },
    {
      title: 'Supplier & Audit Mgmt',
      icon: 'truck',
      items: [
        { title: 'Approved Supplier List (ASL) & Material Qual.' },
        { title: 'Regulatory Vendor Site Audit Scheduling' },
        { title: 'Supplier Corrective Action Requests (SCAR)' },
        { title: 'Internal Audit & Inspection Readiness Tracking' },
      ],
    },
    {
      title: 'eBMR & Product Data',
      icon: 'clipboard',
      items: [
        { title: 'ISA-88 Standard Master Batch Records (MBR)' },
        { title: 'Automated Batch Disposition & Release Workflows' },
        { title: 'Automated COA (Certificate of Analysis) Gen.' },
        { title: 'AI-Generated APQR Analytics ✨ AI' },
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
  title: 'AIVOA QMS Domestic Suite — Schedule M Edition',
  currency: 'INR',
  tax_pct: 18,
  intro:
    '<p>Architected for <b>Continuous Audit Readiness &amp; Schedule M Compliance</b>, the AIVOA QMS Domestic Suite provides a robust digital foundation for life sciences manufacturing.</p>' +
    '<p>Architected specifically to meet the stringent demands of revised Schedule M guidelines, it is designed to eliminate paper-based inefficiencies, ensure complete traceability, and seamlessly manage deviations, change controls, and document lifecycles. By digitizing these core pillars, your facility will remain continuously audit-ready while standardizing quality operations across the plant.</p>',
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
        { title: 'Core Document Control & Versioning' },
        { title: 'Review, Approval & Routing Matrix' },
        { title: 'Controlled / Uncontrolled Print (Watermarks)' },
        { title: 'Document Compliance Check ✨ AI' },
      ],
    },
    {
      title: 'Quality Events (eQMS)',
      icon: 'alert',
      items: [
        { title: 'Deviations, NC & Root Cause Analysis' },
        { title: 'CAPA & Change Control Workflows' },
        { title: 'Market Complaints & Product Recalls' },
        { title: 'Form & Template Builder ✨ AI' },
      ],
    },
    {
      title: 'eMBR & Product Data',
      icon: 'clipboard',
      items: [
        { title: 'Full Item Master, Specs & Recipes (BOM)' },
        { title: 'ISA-88 Standard MBR Builder' },
        { title: 'Batch Issuance & QA Disposition Workflow' },
        { title: 'BMR Template Validation ✨ AI' },
      ],
    },
    {
      title: 'Supplier Management',
      icon: 'truck',
      items: [
        { title: 'Vendor Master & Approved Supplier List (ASL)' },
        { title: 'Vendor Site Qualification & Audits' },
        { title: 'Supplier Corrective Action Requests (SCAR)' },
        { title: 'Vendor Performance Tracking' },
      ],
    },
    {
      title: 'Equipment & Asset Mgmt',
      icon: 'settings',
      items: [
        { title: 'Maintenance & Calibration Scheduler' },
        { title: 'Equipment Qualification (IQ/OQ/PQ)' },
        { title: 'Hard Calibration System Lockouts' },
        { title: 'Paper-to-Digital eLog Book Entry ✨ AI' },
      ],
    },
    {
      title: 'Compliance & Validation',
      icon: 'shield',
      items: [
        { title: 'Schedule M / 21 CFR Audit Trail & E-Signatures' },
        { title: 'CSV Validation Package (URS, FRS, IQ/OQ)' },
        { title: 'Secure Cloud Hosting (AWS/Azure India)' },
        { title: 'AI Compliance Copilot (Chat) ✨ AI' },
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
