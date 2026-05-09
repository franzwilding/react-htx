import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Router } from "../Router";
import { useApp } from "./AppContext";

type RenderFailedPayload = {
  /** whatever your router emits, kept as unknown to avoid tight coupling */
  input: unknown;
  init: unknown;
  pushState: unknown;
  response: unknown;
  html: unknown;
  finalUrl: unknown;
};

export type RenderError = RenderFailedPayload & {
  /** increments for every error so consumers can re-open dialogs */
  id: number;
  /** when the error was captured */
  timestamp: number;
  /**
   * Populated when the error came from `nav:error` (fetch / network
   * failure). For `render:failed` errors this is `undefined` — inspect
   * `response` / `html` instead.
   */
  error?: unknown;
};

type RouterContextType = {
  router: Router;
  loading: boolean;
  /** last render error (if any) */
  lastError: RenderError | null;
  /** clear currently shown error (e.g., when dialog is closed) */
  clearError: () => void;
};

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const { router } = useApp();
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<RenderError | null>(null);
  const errorId = useRef(0);

  useEffect(() => {
    const start = () => setLoading(true);
    const end = () => setLoading(false);

    // The router emits: "render:failed", input, init, pushState, response, html, finalUrl
    const onRenderFailed = (
      input: unknown,
      init: unknown,
      pushState: unknown,
      response: unknown,
      html: unknown,
      finalUrl: unknown,
    ) => {
      errorId.current += 1;
      setLastError({
        id: errorId.current,
        timestamp: Date.now(),
        input,
        init,
        pushState,
        response,
        html,
        finalUrl,
      });
    };

    // The router emits: "nav:error", input, init, pushState, error.
    // Reset the loading flag (since `nav:ended` never fires on this
    // path) and surface the error through the same `lastError` channel.
    const onNavError = (
      input: unknown,
      init: unknown,
      pushState: unknown,
      error: unknown,
    ) => {
      setLoading(false);
      errorId.current += 1;
      setLastError({
        id: errorId.current,
        timestamp: Date.now(),
        input,
        init,
        pushState,
        response: null,
        html: null,
        finalUrl: null,
        error,
      });
    };

    router.on("nav:started", start);
    router.on("nav:ended", end);
    router.on("render:failed", onRenderFailed);
    router.on("nav:error", onNavError);

    return () => {
      router.off("nav:started", start);
      router.off("nav:ended", end);
      router.off("render:failed", onRenderFailed);
      router.off("nav:error", onNavError);
    };
  }, [router]);

  const clearError = () => setLastError(null);

  return (
    <RouterContext.Provider value={{ router, loading, lastError, clearError }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextType {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useRouter must be used inside <RouterProvider>");
  }
  return ctx;
}
