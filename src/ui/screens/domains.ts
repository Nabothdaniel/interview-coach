import type { IconName } from '../icons/Icon';
import type { Domain } from '../../engine';

/** Display metadata only. */
export const DOMAIN_META: Record<Domain, { short: string; label: string; blurb: string; icon: IconName; role: string; tone: 'ink' | 'orange' | 'stone' }> = {
  it: { short: 'IT', label: 'IT', blurb: 'Software, data, networks and support roles', icon: 'code', role: 'Tech roles', tone: 'ink' },
  business: { short: 'Business', label: 'Business Administration', blurb: 'Operations, sales, finance and management roles', icon: 'briefcase', role: 'Business roles', tone: 'orange' },
  graduate: { short: 'Graduate', label: 'General Graduate Roles', blurb: 'Graduate-trainee schemes, NYSC and entry-level roles', icon: 'cap', role: 'Graduate roles', tone: 'stone' },
};
