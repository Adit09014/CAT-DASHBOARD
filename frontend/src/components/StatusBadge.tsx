import type { ReactNode } from 'react';
import { CircleAlert, CircleCheckBig, CircleDashed, TriangleAlert } from 'lucide-react';

type Status = 'green' | 'amber' | 'red' | 'blue' | 'neutral';

const palette: Record<Status, { label: string; icon: ReactNode; chip: string }> = {
  green:   { label: 'Normal',   icon: <CircleCheckBig size={11} />, chip: 'chip chip-green' },
  amber:   { label: 'Caution',  icon: <TriangleAlert size={11} />,  chip: 'chip chip-yellow' },
  red:     { label: 'Critical', icon: <CircleAlert size={11} />,    chip: 'chip chip-red' },
  blue:    { label: 'Info',     icon: <CircleDashed size={11} />,   chip: 'chip chip-blue' },
  neutral: { label: 'Neutral',  icon: <CircleDashed size={11} />,   chip: 'chip chip-neutral' },
};

export function StatusBadge({ state, label }: { state: Status; label?: string }) {
  const { icon, chip, label: defaultLabel } = palette[state];
  return (
    <span className={chip}>
      {icon}
      {label ?? defaultLabel}
    </span>
  );
}
