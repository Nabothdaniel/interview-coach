import { DOMAIN_LABEL, type Domain } from '../../engine';

/** Display metadata only (names come from the engine config so the prompt and UI agree). */
const BLURB: Record<Domain, string> = {
  it: 'Software, data, networks and support roles',
  business: 'Operations, sales, finance and management roles',
  graduate: 'Graduate-trainee schemes, NYSC and entry-level roles',
  finance: 'Accounting, audit, banking and financial analysis',
  engineering: 'Civil, electrical, mechanical and related engineering roles',
  healthcare: 'Nursing, medicine, pharmacy and health administration',
  education: 'Teaching, tutoring and school or training support',
  law: 'Legal practice, compliance and paralegal work',
  marketing: 'Marketing, sales, brand and public relations',
  hr: 'Recruitment, employee relations and people operations',
  customer: 'Customer care, front desk and office administration',
  media: 'Content, design, journalism and creative work',
  logistics: 'Supply chain, warehousing, procurement and delivery',
  energy: 'Oil and gas, power and utilities',
  public: 'Civil service, government agencies, NGOs and development work',
};

export const DOMAIN_META: Record<Domain, { label: string; blurb: string }> = Object.fromEntries(
  (Object.keys(DOMAIN_LABEL) as Domain[]).map((d) => [d, { label: DOMAIN_LABEL[d], blurb: BLURB[d] }]),
) as Record<Domain, { label: string; blurb: string }>;
