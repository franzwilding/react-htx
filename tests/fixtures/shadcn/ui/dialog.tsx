import React, { ReactNode } from "react";

interface DialogProps {
  /** Controls visibility of the dialog. */
  open?: boolean;
  /** Called when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Children include trigger + content. */
  children?: ReactNode;
}

interface DialogTriggerProps {
  /** Render trigger as another element type. */
  asChild?: boolean;
  /** Trigger label. */
  children?: ReactNode;
}

interface DialogContentProps {
  /** Visual size of the dialog content. */
  size?: "sm" | "md" | "lg";
  /** Body of the dialog. */
  children?: ReactNode;
}

interface DialogHeaderProps {
  /** Header content. */
  children?: ReactNode;
}

interface DialogFooterProps {
  /** Footer content (typically action buttons). */
  children?: ReactNode;
}

interface DialogTitleProps {
  /** Title text. */
  children?: ReactNode;
}

interface DialogDescriptionProps {
  /** Description text. */
  children?: ReactNode;
}

function Dialog(props: DialogProps) {
  return <div role="dialog">{props.children}</div>;
}

function DialogTrigger(props: DialogTriggerProps) {
  return <button>{props.children}</button>;
}

function DialogContent(props: DialogContentProps) {
  return <div>{props.children}</div>;
}

function DialogHeader(props: DialogHeaderProps) {
  return <header>{props.children}</header>;
}

function DialogFooter(props: DialogFooterProps) {
  return <footer>{props.children}</footer>;
}

function DialogTitle(props: DialogTitleProps) {
  return <h2>{props.children}</h2>;
}

function DialogDescription(props: DialogDescriptionProps) {
  return <p>{props.children}</p>;
}

// shadcn/ui-style: locally-declared components, exported via a single
// `export { ... }` block at the bottom.
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
