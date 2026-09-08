/**
 * Stands in for `claude -p ... --output-format stream-json`. Reads the prompt
 * on stdin and does what markers in the request text say:
 *   [[sleep=N]]  emit an event every 400ms for N seconds, then a result
 *   [[silent]]   emit init, then never speak again (the watchdog's case)
 *   [[dirty]]    leave an uncommitted file in the checkout, then a result
 *   [[fail]]     a result with is_error: true
 */
import fs from "node:fs";
import path from "node:path";

const chunks = [];
process.stdin.on("data", (d) => chunks.push(d));
process.stdin.on("end", async () => {
  const prompt = Buffer.concat(chunks).toString("utf8");
  // Both lanes wrap the request differently; the line carrying the harness
  // marker is the request, whatever surrounds it.
  const request = (prompt.split("\n").find((l) => l.includes("[[")) || prompt.split("\n")[0]).trim();
  const say = (o) => process.stdout.write(JSON.stringify(o) + "\n");
  say({ type: "system", subtype: "init" });
  if (/\[\[silent\]\]/.test(request)) {
    setInterval(() => {}, 1 << 30); // keep the process alive, saying nothing
    return;
  }
  const sleep = Number((request.match(/\[\[sleep=(\d+)\]\]/) || [])[1] || 0);
  const until = Date.now() + sleep * 1000;
  while (Date.now() < until) {
    say({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "tick" } }] } });
    await new Promise((r) => setTimeout(r, 400));
  }
  if (/\[\[dirty\]\]/.test(request)) fs.writeFileSync(path.join(process.cwd(), "left-behind.txt"), "oops\n");
  const isError = /\[\[fail\]\]/.test(request);
  if (/\[\[attachment\]\]/.test(request)) {
    // Prove the file really is where the prompt says: read it back.
    const m = prompt.match(/^- (\/\S+)\s/m);
    let seen = "no attachment path in prompt";
    if (m) { try { seen = fs.readFileSync(m[1], "utf8").split("\n")[0]; } catch (e) { seen = "unreadable: " + e.message; } }
    say({ type: "result", subtype: "success", is_error: false, result: `OK: attachment says ${seen}` });
    process.exit(0);
  }
  if (/\[\[whoami\]\]/.test(request)) {
    const who = (prompt.match(/^Requester: .*$/m) || ["no Requester line"])[0];
    const roster = (prompt.match(/^- .* — .*$/gm) || []).length;
    say({ type: "result", subtype: "success", is_error: false, result: `OK: ${who} roster=${roster}` });
    process.exit(0);
  }
  if (/\[\[question\]\]/.test(request)) {
    say({ type: "result", subtype: "success", is_error: false, result: "[answer]\nShokunin does UI/UX, frontend and marketing." });
    process.exit(0);
  }
  say({ type: "result", subtype: isError ? "error" : "success", is_error: isError,
        result: isError ? "The fake agent failed on purpose." : `OK: ${request.replace(/\[\[[^\]]*\]\]/g, "").trim().slice(0, 80)}` });
  process.exit(0);
});
