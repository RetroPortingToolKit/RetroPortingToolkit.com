import { useEffect, useState } from "react";
import { Markdown } from "./Markdown";

type Revision = { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } } };
type User = { github_id: string; login: string; discord_id: string | null; docs: number; suspended: number };
async function api(route: string, body?: unknown) {
  const response = await fetch(`/api/cms/wiki/${route}`, body === undefined ? undefined : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "Request failed.");
  return data;
}
// A bounded LCS comparison preserves repeated lines and distinguishes moves as delete/add.
export function lineChanges(before: string, after: string): { kind: string; text: string }[] {
  const a = before.split("\n"), b = after.split("\n");
  if (a.length * b.length > 2000000) return [...a.map(text => ({ kind: "removed", text })), ...b.map(text => ({ kind: "added", text }))];
  const rows = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) rows[i][j] = a[i] === b[j] ? rows[i+1][j+1] + 1 : Math.max(rows[i+1][j], rows[i][j+1]);
  const result = []; let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { result.push({ kind: "same", text: a[i++] }); j++; }
    else if (j < b.length && (i === a.length || rows[i][j+1] >= rows[i+1][j])) result.push({ kind: "added", text: b[j++] });
    else result.push({ kind: "removed", text: a[i++] });
  }
  return result;
}
export function WikiHistory({ id, admin = false, onRestored }: { id: string; admin?: boolean; onRestored?: () => void }) {
  const [revisions, setRevisions] = useState<Revision[]>([]), [next, setNext] = useState<number | null>(null);
  const [selected, setSelected] = useState<Revision | null>(null), [old, setOld] = useState(""), [current, setCurrent] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [previous, setPrevious] = useState("");
  const [compareCurrent, setCompareCurrent] = useState(false);
  const [changedFiles, setChangedFiles] = useState<{path:string;status:string}[]>([]);
  const [currentBase, setCurrentBase] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [preview, setPreview] = useState(false);
  const load = async (page = 1) => {
    try { const d = await api(`history?id=${encodeURIComponent(id)}&page=${page}`); setRevisions(prev => page === 1 ? d.revisions : [...prev, ...d.revisions]); setNext(d.next); }
    catch (e) { setError(String(e)); }
  };
  useEffect(() => { setRevisions([]); setSelected(null); setError(""); void load(); }, [id]);
  const inspect = async (revision: Revision) => {
    setBusy(true); setError("");
    try {
      const [historical, latest] = await Promise.all([api(`revision?id=${encodeURIComponent(id)}&ref=${revision.sha}`), fetch(`/api/cms/wiki/history?id=${encodeURIComponent(id)}`).then(r => r.json())]);
      const latestRef = latest.latestRef || latest.revisions?.[0]?.sha;
      if (!latestRef) throw new Error("Current revision unavailable.");
      const now = await api(`revision?id=${encodeURIComponent(id)}&ref=${latestRef}`);
      setPreviewBody(historical.raw.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/\]\(\.\/([^\s)]+)\)/g, (_:string, file:string) => `](https://raw.githubusercontent.com/RetroPortingToolKit/RetroPortingToolkit.com/${revision.sha}/${(historical.id || id).slice(0, -8)}${file})`));
      setOld(historical.raw); setPrevious(historical.previousRaw || ""); setChangedFiles(historical.files || []); setCompareCurrent(false); setCurrent(now.raw); setCurrentBase(now.baseSha); setSelected(revision);
    } catch(e) { setError(String(e)); } finally { setBusy(false); }
  };
  const restore = async () => {
    const reason = window.prompt("Reason for restoring this page and its local media:");
    if (!reason?.trim() || !selected) return;
    setBusy(true); setError("");
    try {
      await api("restore", { id, ref: selected.sha, expectedBase: currentBase, reason });
      setSelected(null); await load(); onRestored?.();
    } catch(e) { setError(String(e)); } finally { setBusy(false); }
  };
  return <section className="wiki-panel" aria-label="Page history">
    <h2>Page history</h2><p>Choose a revision to see its changes, preview it, or compare it with the current page.</p>
    {error && <p role="alert">{error}</p>}
    <details open={!selected}><summary>Choose a revision ({revisions.length} loaded)</summary><ol>{revisions.map(revision => <li key={revision.sha}><button disabled={busy} onClick={() => void inspect(revision)}>{revision.commit.author.name} · {new Date(revision.commit.author.date).toLocaleString()} · {revision.commit.message.split("\n")[0]}</button> <a href={revision.html_url} target="_blank" rel="noreferrer">GitHub</a></li>)}</ol>
    {next && <button disabled={busy} onClick={() => void load(next)}>Older changes</button>}
    </details>
    {selected && <><h3>{compareCurrent ? "Selected revision → current page" : "Changes in this revision"}</h3><pre style={{whiteSpace:"pre-wrap"}}>{selected.commit.message}</pre><button onClick={() => setCompareCurrent(!compareCurrent)}>{compareCurrent ? "Show changes in this revision" : "Compare with current page"}</button><ul>{changedFiles.map(file => <li key={file.path}>{file.status}: {file.path}</li>)}</ul><button onClick={() => setPreview(!preview)}>{preview ? "Show changes" : "Preview selected revision"}</button>
      {admin && compareCurrent && !!old && <button disabled={busy} onClick={() => void restore()}>Restore this revision</button>}
      {preview ? <Markdown>{previewBody}</Markdown> : <pre className="wiki-diff">{lineChanges(compareCurrent ? old : previous, compareCurrent ? current : old).map((line, i) => <span key={i} className={`wiki-${line.kind}`}>{line.kind === "added" ? "+ " : line.kind === "removed" ? "- " : "  "}{line.text}{"\n"}</span>)}</pre>}
    </>}
  </section>;
}
export function WikiAccount({ admin, selectedId }: { admin: boolean; selectedId?: string }) {
  const [removedPath, setRemovedPath] = useState("");
  const [removedHistory, setRemovedHistory] = useState("");
  const [code, setCode] = useState(""), [error, setError] = useState(""), [users, setUsers] = useState<User[]>([]), [events, setEvents] = useState<{id:number;actor:string;action:string;target:string;reason:string;at:string}[]>([]);
  const [pending, setPending] = useState<{hash:string;discord_id:string;discord_name:string}[]>([]);
  const [protectedIds, setProtectedIds] = useState<string[]>([]), [account, setAccount] = useState<{ discord_id: string | null; docs: number } | null>(null);
  const reload = async () => {
    const d = await api("account"); setAccount(d.user); setPending(d.pending || []);
    if (admin) { const result = await api("admin"); setUsers(result.users); setEvents(result.audit); setProtectedIds(result.protections.map((p:{path:string}) => p.path)); }
  };
  useEffect(() => { void reload().catch(e => setError(String(e))); }, [admin]);
  const update = async (route: string, body: Record<string, unknown>) => {
    const reason = window.prompt("Reason for this permission change:"); if (!reason?.trim()) return;
    try { await api(route, { ...body, reason }); await reload(); } catch(e) { setError(String(e)); }
  };
  return <section className="wiki-panel"><h2>Contributions</h2>{error && <p role="alert">{error}</p>}
    <p>Sign in with GitHub, then link Discord to use your contribution access through the bot. Ask an org admin for docs access if you cannot edit yet.</p>
    <details><summary>Contribute from Discord</summary><p>Mention the bot first, followed by one of these requests. The bot checks the same docs permissions as this editor.</p><pre style={{whiteSpace:"pre-wrap"}}>{"wiki edit /docs/start/quickstart Explain the missing setup step using these facts: ...\n\nwiki new start Setup guide\nWrite a guide using these facts: ..."}</pre></details>
    {account?.discord_id ? <p>Discord linked: {account.discord_id}</p> : <button onClick={() => void api("link", {}).then(d => setCode(d.code)).catch(e => setError(String(e)))}>Link Discord</button>}
    {code && <p>Within ten minutes, send the bot a direct mention in the server followed by <code>link {code}</code>. Then refresh here and confirm your Discord account. The code works once; only confirm an account you recognize.</p>}
    {pending.map(link => <p key={link.hash}>Confirm that Discord account <strong>{link.discord_name}</strong> ({link.discord_id}) is yours: <button onClick={() => void api("confirm-link", { hash: link.hash }).then(reload).catch(e => setError(String(e)))}>Confirm account link</button></p>)}
    <button onClick={() => void reload().catch(e => setError(String(e)))}>Refresh access</button>
    {admin && <><h3>Contributors</h3><table><thead><tr><th>GitHub</th><th>Discord</th><th>Docs grant</th><th>Website access</th><th>Link</th></tr></thead><tbody>{users.map(user => <tr key={user.github_id}><td>{user.login}</td><td>{user.discord_id || "Unlinked"}</td><td><button onClick={() => void update("user", { githubId: user.github_id, docs: !user.docs })}>{user.docs ? "Revoke docs grant" : "Grant docs access"}</button></td><td><button onClick={() => void update("user", { githubId: user.github_id, suspended: !user.suspended })}>{user.suspended ? "Enable user" : "Disable user"}</button></td><td>{user.discord_id && <button onClick={() => void update("user", { githubId: user.github_id, unlink: true })}>Clear link</button>}</td></tr>)}</tbody></table>
      {selectedId?.startsWith("data/docs/") && <button onClick={() => void update("protect", { id: selectedId, protected: !protectedIds.includes(selectedId) })}>{protectedIds.includes(selectedId) ? "Allow community edits to this page" : "Protect this page"}</button>}
      <details><summary>Recover a removed docs page</summary><p>Enter its repository path, for example data/docs/01_start/01_example/index.md. Its path is recorded in the deletion commit.</p><input aria-label="Removed docs page path" value={removedPath} onChange={e => setRemovedPath(e.target.value)} /><button onClick={() => setRemovedHistory(removedPath)}>Open page history</button>{removedHistory && <WikiHistory id={removedHistory} admin />}</details>
      <h3>Recent administration</h3><ul>{events.map(event => <li key={event.id}>{event.at} · {event.actor} · {event.action} · {event.target}: {event.reason}</li>)}</ul>
    </>}
  </section>;
}
