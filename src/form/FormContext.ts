import { createContext } from "react";

export type FormError = {
  /** Field name the error belongs to. Matches the `name` of an input. */
  name?: string;
  /** Optional element id to scroll to when error summary is clicked. */
  id?: string;
  /** Human-readable label used for prefixing error summaries. */
  label?: string;
  /** The error message. */
  message: string;
};

export const FormErrorsContext = createContext<FormError[]>([]);

export const FormSubmittingContext = createContext<boolean>(false);
