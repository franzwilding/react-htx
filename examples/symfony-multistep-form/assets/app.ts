import "./app.css";
import {App, createLoader} from "reactolith";

const loader = createLoader({
  modules: [
      import.meta.glob("./components/app/*.tsx"),
      import.meta.glob("./components/ui/*.tsx"),
  ],
  prefix: "ui-",
  onMissing: () => null,
});

new App(loader);

