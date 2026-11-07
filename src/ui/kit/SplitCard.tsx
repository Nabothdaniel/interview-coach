import type { ReactNode } from 'react';

/** Two-panel card from the auth reference: form on the left, hero panel on the right (hidden on small screens). */
export function SplitCard({ children, hero }: { children: ReactNode; hero: ReactNode }) {
  return (
    <div className="ui-split">
      <div className="ui-split__main">{children}</div>
      <aside className="ui-split__hero" aria-hidden="true">{hero}</aside>
    </div>
  );
}
