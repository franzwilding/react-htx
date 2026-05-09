import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import React from "react";
import { App } from "../src";
import { Form, useFormErrors, useFormSubmitting } from "../src/form";
import type { FormError } from "../src/form";

const makeFetch = (html: string) =>
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      redirected: false,
      url: "/submitted",
      text: () => Promise.resolve(html),
    }),
  );

const apps: App[] = [];

const mountApp = (...args: ConstructorParameters<typeof App>): App => {
  const app = new App(...args);
  apps.push(app);
  return app;
};

beforeEach(() => {
  vi.clearAllMocks();
  while (apps.length) apps.pop()?.destroy();
  document.body.innerHTML = "";
  // Always install a fetch mock so any stray listener does not hit
  // the real (undici) fetch.
  global.fetch = makeFetch(
    `<div id="reactolith-app" data-testid="reactolith-app"></div>`,
  ) as never;
});

describe("Form errors via context", () => {
  it("provides errors via context and exposes them per-field", async () => {
    const errors: FormError[] = [
      { name: "email", message: "Invalid email" },
      { name: "password", message: "Too short" },
    ];

    function Page({ is }: { is: string }) {
      if (is !== "my-page") return null;
      return (
        <Form errors={errors} action="/submit" method="POST">
          <EmailErrors />
          <PasswordErrors />
          <SummaryErrors />
        </Form>
      );
    }

    function EmailErrors() {
      const errs = useFormErrors("email");
      return (
        <div data-testid="email-errors">
          {errs.map((e) => e.message).join("|")}
        </div>
      );
    }

    function PasswordErrors() {
      const errs = useFormErrors("password");
      return (
        <div
          data-testid="password-errors"
          data-invalid={errs.length > 0 ? "true" : "false"}
        >
          {errs.map((e) => e.message).join("|")}
        </div>
      );
    }

    function SummaryErrors() {
      const all = useFormErrors();
      return (
        <ul data-testid="summary">
          {all.map((e) => (
            <li key={`${e.name}:${e.message}`}>{e.message}</li>
          ))}
        </ul>
      );
    }

    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app"><my-page></my-page></div>`;
    mountApp(Page);

    await waitFor(() => {
      expect(screen.getByTestId("email-errors")).toHaveTextContent(
        "Invalid email",
      );
    });
    expect(screen.getByTestId("password-errors")).toHaveTextContent(
      "Too short",
    );
    expect(screen.getByTestId("password-errors")).toHaveAttribute(
      "data-invalid",
      "true",
    );
    expect(screen.getByTestId("summary")).toHaveTextContent("Invalid email");
    expect(screen.getByTestId("summary")).toHaveTextContent("Too short");
  });

  it("wires errors to native constraint validation and clears them on input", async () => {
    const errors: FormError[] = [{ name: "email", message: "Invalid email" }];

    function Page({ is }: { is: string }) {
      if (is !== "my-page") return null;
      return (
        <Form errors={errors} action="/submit" method="POST">
          <input data-testid="email-input" name="email" />
        </Form>
      );
    }

    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app"><my-page></my-page></div>`;
    mountApp(Page);

    const input = (await screen.findByTestId(
      "email-input",
    )) as HTMLInputElement;

    await waitFor(() => {
      expect(input.validity.customError).toBe(true);
    });
    expect(input.validationMessage).toBe("Invalid email");

    fireEvent.input(input, { target: { value: "user@example.com" } });

    expect(input.validity.customError).toBe(false);
    expect(input.validationMessage).toBe("");
  });
});

describe("Form submitting state", () => {
  it("flips submitting=true on submit and back to false after navigation", async () => {
    const fetchMock = makeFetch(
      `<div id="reactolith-app" data-testid="reactolith-app"><my-page></my-page></div>`,
    );
    global.fetch = fetchMock as never;

    const submittingHistory: boolean[] = [];

    function SubmitWatcher() {
      const submitting = useFormSubmitting();
      submittingHistory.push(submitting);
      return (
        <button
          data-testid="submit"
          type="submit"
          data-submitting={submitting ? "1" : "0"}
        >
          submit
        </button>
      );
    }

    function Page({ is }: { is: string }) {
      if (is !== "my-page") return null;
      return (
        <Form action="/submit" method="POST">
          <input name="x" defaultValue="y" readOnly />
          <SubmitWatcher />
        </Form>
      );
    }

    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app"><my-page></my-page></div>`;
    mountApp(Page);

    const button = await screen.findByTestId("submit");
    expect(button).toHaveAttribute("data-submitting", "0");

    const form = button.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByTestId("submit")).toHaveAttribute(
        "data-submitting",
        "0",
      );
    });

    // Submitting was true at some point.
    expect(submittingHistory.some((v) => v)).toBe(true);
  });

  it("resets submitting back to false when the submission fetch rejects", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
    global.fetch = fetchMock as never;

    function Page({ is }: { is: string }) {
      if (is !== "my-page") return null;
      return (
        <Form action="/submit" method="POST">
          <input name="x" defaultValue="y" readOnly />
          <SubmitWatcher />
        </Form>
      );
    }

    function SubmitWatcher() {
      const submitting = useFormSubmitting();
      return (
        <button
          data-testid="submit"
          type="submit"
          data-submitting={submitting ? "1" : "0"}
        >
          submit
        </button>
      );
    }

    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app"><my-page></my-page></div>`;
    mountApp(Page);

    const button = await screen.findByTestId("submit");
    expect(button).toHaveAttribute("data-submitting", "0");

    const form = button.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Even though the fetch rejected, the form must NOT be stuck in a
    // submitting state forever — `nav:error` should have flipped the flag.
    await waitFor(() => {
      expect(screen.getByTestId("submit")).toHaveAttribute(
        "data-submitting",
        "0",
      );
    });
  });

  it("calls user-provided onSubmit before submission proceeds", async () => {
    const fetchMock = makeFetch(
      `<div id="reactolith-app" data-testid="reactolith-app"><my-page></my-page></div>`,
    );
    global.fetch = fetchMock as never;

    const onSubmit = vi.fn();

    function Page({ is }: { is: string }) {
      if (is !== "my-page") return null;
      return (
        <Form action="/submit" method="POST" onSubmit={onSubmit}>
          <input name="x" defaultValue="y" readOnly />
          <button data-testid="submit" type="submit">
            submit
          </button>
        </Form>
      );
    }

    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app"><my-page></my-page></div>`;
    mountApp(Page);

    const button = await screen.findByTestId("submit");
    const form = button.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it("does not navigate when user-provided onSubmit calls preventDefault", async () => {
    const fetchMock = makeFetch(`<div id="reactolith-app"></div>`);
    global.fetch = fetchMock as never;

    const onSubmit = (e: React.FormEvent) => e.preventDefault();

    function Page({ is }: { is: string }) {
      if (is !== "my-page") return null;
      return (
        <Form action="/submit" method="POST" onSubmit={onSubmit}>
          <button data-testid="submit" type="submit">
            submit
          </button>
        </Form>
      );
    }

    document.body.innerHTML = `<div id="reactolith-app" data-testid="reactolith-app"><my-page></my-page></div>`;
    mountApp(Page);

    const button = await screen.findByTestId("submit");
    const form = button.closest("form")!;
    fireEvent.submit(form);

    // Give a tick — fetch should still NOT be called.
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
