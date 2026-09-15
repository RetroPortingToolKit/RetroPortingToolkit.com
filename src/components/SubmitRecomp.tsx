import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function SubmitRecompLink({ className = '' }: { className?: string }) {
  return <a className={`submit-recomp-link ${className}`} href="/?submit=recomp" onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.dispatchEvent(new Event('rpt:submit-recomp'));
  }}>Submit a recomp <span aria-hidden="true">↗</span></a>;
}
export function SubmitRecompDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ message: string; url: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const show = () => { setOpen(true); };
    window.addEventListener('rpt:submit-recomp', show);
    return () => window.removeEventListener('rpt:submit-recomp', show);
  }, []);
  useEffect(() => { if (new URLSearchParams(location.search).get('submit') === 'recomp') setOpen(true); }, [location.search]);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    element.querySelector<HTMLInputElement>("#recomp-repo")?.focus();
    return () => { element.close(); document.body.style.overflow = previous; };
  }, [open]);
  const close = () => {
    setOpen(false);
    if (new URLSearchParams(location.search).has('submit')) {
      const query = new URLSearchParams(location.search); query.delete('submit');
      navigate({ pathname: location.pathname, search: query.toString(), hash: location.hash }, { replace: true });
    }
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/submissions', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(fields)), signal: AbortSignal.timeout(60_000) });
      const data = await response.json().catch(() => { throw new Error("Submissions are temporarily unavailable. Please try again shortly."); });
      if (!response.ok) throw new Error(data.error || 'Your submission could not be sent. Please try again.');
      if (typeof data.record?.url !== 'string' || !/^\/games\/[a-z0-9-]+$/.test(data.record.url)) throw new Error('The server returned an incomplete result. Please retry; duplicate submissions are detected.');
      setResult({ message: data.message, url: data.record.url });
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== 'TimeoutError' ? failure.message : 'The request timed out. Please retry; duplicate submissions are detected.');
    } finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="recomp-dialog" aria-labelledby="recomp-title" aria-describedby="recomp-intro"
    onKeyDown={event => event.stopPropagation()}
    onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget && !busy) close(); }}>
    <div className="recomp-dialog-inner">
      <button type="button" className="recomp-close" aria-label="Close submission form" onClick={close}>×</button>
      <p className="recomp-eyebrow">Made something worth playing?</p>
      <h2 id="recomp-title">Submit a recomp.</h2>
      <p id="recomp-intro">Share your project with the community. Start with its repository; we’ll fill in anything you leave blank.</p>
      {result ? <div className="recomp-result" role="status">
        <h3>Thanks for sharing.</h3><p>{result.message}</p>
        <a className="recomp-primary" href={result.url}>Open game page ↗</a>
        <button type="button" className="recomp-another" onClick={() => { setResult(null); setError(''); form.current?.reset(); }}>Submit another project</button>
      </div> : <form ref={form} onSubmit={submit}>
        <label htmlFor="recomp-repo">Repository URL</label>
        <input id="recomp-repo" name="repo" type="url" required maxLength={300} autoFocus placeholder="https://github.com/you/your-recomp" aria-describedby="recomp-repo-help" />
        <p id="recomp-repo-help" className="recomp-help">A public repository on GitHub or GitLab.</p>
        <label htmlFor="recomp-name">Project name <span>Optional</span></label>
        <input id="recomp-name" name="name" maxLength={100} placeholder="The name of your game or port" />
        <label htmlFor="recomp-description">Description <span>Optional</span></label>
        <textarea id="recomp-description" name="description" maxLength={500} rows={3} placeholder="What have you made? What can people try?" />
        <div className="subscribe-hp" aria-hidden="true"><label htmlFor="recomp-company">Company</label><input id="recomp-company" name="company" tabIndex={-1} autoComplete="off" /></div>
        <p className="recomp-note">Your page publishes automatically, usually within a couple of minutes. The team can confirm or remove it. Repository ownership is credited publicly.</p>
        {error && <p className="recomp-error" role="alert">{error}</p>}
        <button className="recomp-primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit a recomp'}</button>
        <a className="recomp-guide" href="/docs/start/submit-a-recomp" onClick={close}>How submissions work</a>
      </form>}
    </div>
  </dialog>;
}
