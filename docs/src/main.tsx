import "@/index.css";
import { App, createLoader } from "reactolith";
import { AppProvider } from "@/components/app-provider";

// Two prefixes are handled by a single loader:
//   <ui-…>   → strip "ui-", look up in components/ui (e.g. <ui-button> → button.tsx)
//   <app-…>  → no strip, look up the full name in components/app (e.g. <app-sidebar> → app-sidebar.tsx)
const component = createLoader({
  modules: [
    import.meta.glob("./components/app/*.tsx"),
    import.meta.glob("./components/ui/*.tsx"),
  ],
  prefix: "ui-",
  onMissing: (name, is) => {
    console.warn(`[reactolith-docs] Unknown component <${is}> (${name}).`);
    return null;
  },
});

new App(component, AppProvider, "#reactolith-app");
