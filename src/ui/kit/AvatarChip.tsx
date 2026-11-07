import { Icon, type IconName } from '../icons/Icon';
import { Tip } from './Tooltip';

export interface AvatarChipProps { name: string; role: string; icon: IconName; tone?: 'ink' | 'orange' | 'stone'; selected?: boolean; disabled?: boolean; onSelect?: () => void; tip?: string }

/** Round "story" chip from the reference's top row: circle, bold name, muted role. */
export function AvatarChip({ name, role, icon, tone = 'ink', selected = false, disabled = false, onSelect, tip }: AvatarChipProps) {
  const btn = (
    <button type="button" className="ui-av" aria-pressed={selected} disabled={disabled} onClick={onSelect}>
      <span className={`ui-av__c${tone === 'ink' ? '' : ` ui-av__c--${tone}`}`}><Icon name={icon} size={22} /></span>
      <span>{name}</span>
      <span className="ui-meta">{role}</span>
    </button>
  );
  return tip ? <Tip text={tip} side="bottom">{btn}</Tip> : btn;
}
