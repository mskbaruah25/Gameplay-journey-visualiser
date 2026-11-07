import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}

export function SelectField({ id, label, icon: Icon, value, onChange, children, disabled }: Props) {
  return <div className="select-field">
    <label htmlFor={id}>{label}</label>
    <div className="select-wrap">
      <Icon size={16} aria-hidden="true" />
      <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{children}</select>
      <ChevronDown size={14} className="select-chevron" aria-hidden="true" />
    </div>
  </div>;
}
