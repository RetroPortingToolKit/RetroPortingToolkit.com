import { useState } from "react";

/**
 * The subscribe form's behaviour, shared by the block at the end of the blog
 * list and the corner box.
 *
 * One copy on purpose: the two are the same request with different chrome, and
 * this repo has already paid for keeping two descriptions of one thing in step
 * by hand (see the CMS note in AGENTS.md).
 */
export type SubscribeState = {
  status: "idle" | "busy" | "done" | "error";
  message?: string;
};

export function useSubscribeForm(onSubscribed?: () => void) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [state, setState] = useState<SubscribeState>({ status: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.status === "busy") return;
    setState({ status: "busy" });
    try {
      const r = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const body = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (r.ok && body.ok) {
        setState({
          status: "done",
          message: "Check your inbox for a confirmation link. Nothing is sent until you click it.",
        });
        setEmail("");
        onSubscribed?.();
      } else {
        setState({ status: "error", message: body.error || "Something went wrong. Try again shortly." });
      }
    } catch {
      setState({ status: "error", message: "Could not reach the server. Try again shortly." });
    }
  }

  return { email, setEmail, company, setCompany, state, onSubmit };
}
