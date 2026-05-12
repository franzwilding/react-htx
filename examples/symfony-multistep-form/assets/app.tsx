import "./app.css";
import { App, Form, createLoader } from "reactolith";

import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import {
  CheckboxGroup,
  CheckboxGroupItem,
} from "./components/ui/checkbox-group";
import { ColorPicker } from "./components/ui/color-picker";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "./components/ui/field";
import { FileInput } from "./components/ui/file-input";
import { Input } from "./components/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "./components/ui/radio-group";
import { Option, Select } from "./components/ui/select";
import { Slider } from "./components/ui/slider";
import { Textarea } from "./components/ui/textarea";

import { Collection, CollectionRow } from "./components/flow/collection";
import { FlowNavigator } from "./components/flow/navigator";
import { FlowProgress } from "./components/flow/progress";

/**
 * Mount reactolith on the page root. Every `<ui-*>`, `<flow-*>`, `<my-form>`
 * tag in the server-rendered HTML is resolved to one of the React components
 * imported above. Anything else stays plain DOM (`<div>`, `<ol>`, `<p>` …).
 *
 * We don't use `createLoader` here on purpose: this example deliberately
 * ships every component up-front so the demo is a single bundle that's easy
 * to read. In a real app `createLoader({ modules: import.meta.glob(...) })`
 * gives you lazy-loaded components without any per-tag wiring.
 */
const registry: Record<string, React.ComponentType<Record<string, unknown>>> = {
  "my-form": Form,

  // Form layout primitives.
  "ui-field": Field,
  "ui-field-label": FieldLabel,
  "ui-field-description": FieldDescription,
  "ui-field-error": FieldError,

  // Controls.
  "ui-input": Input,
  "ui-textarea": Textarea,
  "ui-button": Button,
  "ui-checkbox": Checkbox,
  "ui-checkbox-group": CheckboxGroup,
  "ui-checkbox-group-item": CheckboxGroupItem,
  "ui-radio-group": RadioGroup,
  "ui-radio-group-item": RadioGroupItem,
  "ui-select": Select,
  "ui-option": Option,
  "ui-slider": Slider,
  "ui-color": ColorPicker,
  "ui-file": FileInput,

  // FormFlow integration components.
  "flow-progress": FlowProgress,
  "flow-navigator": FlowNavigator,
  "flow-collection": Collection,
  "flow-collection-row": CollectionRow,
};

new App(({ is }) => registry[is] ?? null);
