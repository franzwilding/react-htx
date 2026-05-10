import React, { ReactNode } from "react";

interface CardProps {
  /** Optional className to merge with the card chrome. */
  className?: string;
  children?: ReactNode;
}

interface CardHeaderProps {
  children?: ReactNode;
}

interface CardTitleProps {
  /** Title content. */
  children?: ReactNode;
}

interface CardDescriptionProps {
  children?: ReactNode;
}

interface CardContentProps {
  /** Body of the card. */
  children?: ReactNode;
}

interface CardFooterProps {
  children?: ReactNode;
}

export function Card({ className, children }: CardProps) {
  return <div className={className}>{children}</div>;
}

export function CardHeader({ children }: CardHeaderProps) {
  return <div>{children}</div>;
}

export function CardTitle({ children }: CardTitleProps) {
  return <h3>{children}</h3>;
}

export function CardDescription({ children }: CardDescriptionProps) {
  return <p>{children}</p>;
}

export function CardContent({ children }: CardContentProps) {
  return <div>{children}</div>;
}

export function CardFooter({ children }: CardFooterProps) {
  return <div>{children}</div>;
}
