import { useState, useCallback, useEffect, ReactNode } from "react";
import { useApp } from "./provider/AppContext";
import { ReactolithComponent } from "./ReactolithComponent";
import { useMercureEventSource } from "./useMercureEventSource";

/**
 * Component that subscribes to a Mercure topic and renders HTML updates.
 *
 * Use this for partial page updates that should be reflected across all pages,
 * like sidebars, notification areas, or live feeds.
 *
 * @example
 * ```tsx
 * <MercureLive topic="/sidebar">
 *   <sidebar-component>Initial content</sidebar-component>
 * </MercureLive>
 * ```
 *
 * Backend can push updates to this region:
 * ```php
 * $update = new Update('/sidebar', $sidebarHtml);
 * $hub->publish($update);
 * ```
 */
export interface MercureLiveProps {
  /** The Mercure topic to subscribe to */
  topic: string;
  /** Initial content to display before any updates */
  children: ReactNode;
}

// DOMParser is stateless within a single JS realm; reuse one instance to avoid
// allocating per incoming Mercure message on high-throughput topics. Constructed
// lazily so that importing this module in a non-DOM environment (e.g. SSR via
// `reactolith/server`, or a Node test runner without jsdom) does not throw.
let parser: DOMParser | null = null;
function getParser(): DOMParser {
  if (!parser) parser = new DOMParser();
  return parser;
}

export function MercureLive({ topic, children }: MercureLiveProps) {
  const app = useApp();
  const [content, setContent] = useState<ReactNode>(children);

  // Update content when children prop changes (e.g., during navigation)
  useEffect(() => {
    setContent(children);
  }, [children]);

  const handleMessage = useCallback(
    (data: string) => {
      try {
        const doc = getParser().parseFromString(data, "text/html");
        const element = doc.body.firstElementChild as HTMLElement;

        if (element) {
          setContent(
            <ReactolithComponent element={element} component={app.component} />,
          );
        } else {
          console.warn("MercureLive: No element found in Mercure message");
        }
      } catch (error) {
        console.error("MercureLive: Failed to parse message:", error);
      }
    },
    [app.component],
  );

  const handleError = useCallback((error: Event) => {
    console.error("MercureLive: EventSource error:", error);
  }, []);

  useMercureEventSource(topic, handleMessage, handleError);

  return <>{content}</>;
}
