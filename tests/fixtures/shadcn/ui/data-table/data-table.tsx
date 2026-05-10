import React, { ReactNode } from "react";

interface DataTableProps {
  /** Striped rows. */
  striped?: boolean;
  /** Caption text. */
  caption?: string;
  children?: ReactNode;
}

interface DataTableHeaderProps {
  children?: ReactNode;
}

interface DataTableRowProps {
  /** Highlight as selected. */
  selected?: boolean;
  children?: ReactNode;
}

interface DataTableCellProps {
  /** Cell alignment. */
  align?: "left" | "center" | "right";
  children?: ReactNode;
}

export function DataTable(props: DataTableProps) {
  return <table>{props.children}</table>;
}
export function DataTableHeader(props: DataTableHeaderProps) {
  return <thead>{props.children}</thead>;
}
export function DataTableRow(props: DataTableRowProps) {
  return <tr>{props.children}</tr>;
}
export function DataTableCell(props: DataTableCellProps) {
  return <td>{props.children}</td>;
}
