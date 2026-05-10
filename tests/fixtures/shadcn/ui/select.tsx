import React, { ReactNode } from "react";

interface SelectProps {
  /** Default value. */
  defaultValue?: string;
  /** Selected value (controlled). */
  value?: string;
  /** Called when the value changes. */
  onValueChange?: (value: string) => void;
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** Option list + trigger. */
  children?: ReactNode;
}

interface SelectTriggerProps {
  /** Visual size of the trigger. */
  size?: "default" | "sm";
  children?: ReactNode;
}

interface SelectValueProps {
  /** Placeholder shown when nothing is selected. */
  placeholder?: string;
}

interface SelectContentProps {
  /** Position the popover above or below the trigger. */
  position?: "item-aligned" | "popper";
  children?: ReactNode;
}

interface SelectItemProps {
  /** Value sent to onValueChange when selected. */
  value: string;
  /** Hide the item from rendering. */
  disabled?: boolean;
  children?: ReactNode;
}

interface SelectGroupProps {
  children?: ReactNode;
}

interface SelectLabelProps {
  children?: ReactNode;
}

interface SelectSeparatorProps {
  /** Decorative className. */
  className?: string;
}

export function Select(props: SelectProps) {
  return <div>{props.children}</div>;
}
export function SelectTrigger(props: SelectTriggerProps) {
  return <button>{props.children}</button>;
}
export function SelectValue(props: SelectValueProps) {
  return <span>{props.placeholder}</span>;
}
export function SelectContent(props: SelectContentProps) {
  return <div>{props.children}</div>;
}
export function SelectItem(props: SelectItemProps) {
  return <div>{props.children}</div>;
}
export function SelectGroup(props: SelectGroupProps) {
  return <div>{props.children}</div>;
}
export function SelectLabel(props: SelectLabelProps) {
  return <div>{props.children}</div>;
}
export function SelectSeparator(props: SelectSeparatorProps) {
  return <hr className={props.className} />;
}
