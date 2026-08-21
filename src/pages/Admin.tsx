// DEV-ONLY content editor, organized BY PAGE. The sidebar lists pages (Home,
// each project/talk/writing/blog/source page) plus the code-copy files;
// selecting one shows everything editable on it in one screen, with a live
// preview that reloads on save. Edits auto-save (debounce + on blur) to the
// working-tree files via the dev middleware in scripts/cms-dev.mjs. The write
// API exists ONLY on the local dev server, so on prod this page shows a notice.
// Publishing stays manual: edit here, then commit + push.
//
// The "Home" page is a composite: its hero/identity is data/about.md and its
// proof/recognition/philosophy is data/home.json, edited together here.
//
// Chrome comes from src/styles/apple.css (scoped to .applecms), the same Apple
// HIG token set and component vocabulary this markup was written against.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import { FOLDER_KIND, NEW_LABEL } from "@/lib/cmsKinds";
import { labAll, type LabMedia } from "@/lab/labContent";
import { SpatialCard } from "@/components/SpatialCard";

type DocType = "md" | "json" | "raw" | "home";
interface ListItem {
  id: string;
  title: string;
  sub?: string;
  type: DocType;
}
interface Group {
  group: string;
  items: ListItem[];
}
interface MdFields {
  title: string;
  desc: string;
  kicker: string;
  date: string;
  /** repo path or ./name of the lead image or video */
  cover: string;
  tags: string[];
}
interface HomeRecGroup {
  label: string;
  items: string; // one "Text | /href" per line
}
interface HomeBuf {
  aboutFrontmatter: string;
  aboutBody: string;
  about: { headerName: string; heroTitle: string; role: string; eyebrow: string; tagline: string; email: string; locations: string };
  proof: string[];
  recognition: HomeRecGroup[];
  philosophy: string; // one principle per line
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Surgically set a scalar field in raw YAML frontmatter (quote with JSON so the
// value can never break the YAML), preserving every other line/comment.
function setScalar(fm: string, key: string, value: string): string {
  const line = `${key}: ${JSON.stringify(value)}`;
  const re = new RegExp(`^${escapeRe(key)}:.*$`, "m");
  if (re.test(fm)) return fm.replace(re, line);
  return fm.replace(/\s*$/, "") + `\n${line}`;
}
// Replace a block/inline list field (e.g. tags, locations) with a regenerated block.
function setList(fm: string, key: string, items: string[]): string {
  const block = items.length
    ? `${key}:\n` + items.map((t) => `  - ${JSON.stringify(t)}`).join("\n")
    : `${key}: []`;
  const re = new RegExp(`^${escapeRe(key)}:[^\\n]*(?:\\n[ \\t]+-[^\\n]*)*`, "m");
  if (re.test(fm)) return fm.replace(re, block);
  return fm.replace(/\s*$/, "") + `\n${block}`;
}

// recognition group items <-> "Text | /href" lines
const recItemsToText = (items: { text: string; href: string }[]) =>
  items.map((it) => `${it.text} | ${it.href}`).join("\n");
const recTextToItems = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("|");
      return i < 0 ? { text: l, href: "" } : { text: l.slice(0, i).trim(), href: l.slice(i + 1).trim() };
    });

// The public page this content renders on, for the live preview.
// Sidebar folder label -> the data/ directory a new item goes in. Folders not
// listed here (Pages, Sources) are not collections you add to from the editor.

const ITEM_ID_RE = /^data\/(blog|hardware|games)\/\d*_?([^/]+)\/index\.md$/;
const KIND_OF_DIR: Record<string, LabMedia["kind"]> = { blog: "blog", hardware: "hardware", games: "game" };

const MEDIA_BY_KEY = new Map<string, LabMedia>();
for (const k of ["hardware", "game", "blog"] as const) {
  for (const m of labAll[k]) MEDIA_BY_KEY.set(`${m.kind}-${m.slug}`, m);
}

/** The published card for an editable item, when it has one. */
function mediaForItem(id: string): LabMedia | null {
  const m = id.match(ITEM_ID_RE);
  if (!m) return null;
  const kind = KIND_OF_DIR[m[1]];
  return (kind && MEDIA_BY_KEY.get(`${kind}-${m[2]}`)) || null;
}

function previewFor(id: string): string {
  let m: RegExpMatchArray | null;
  if (id === "page:home") return "/";
  if ((m = id.match(/^data\/(blog|hardware|games)\/\d*_?([^/]+)\/index\.md$/)))
    return `/${m[1]}/${m[2]}`;
  if ((m = id.match(/^data\/sources\/(.+)\.md$/))) return `/source/${m[1]}`;
  return "/"; // home copy files render on the home page
}

const V = {
  bg: "var(--bg, #ffffff)",
  ink: "var(--ink, #16161a)",
  ink2: "var(--ink-2, #55555c)",
  ink3: "var(--ink-3, #86868b)",
  line: "var(--hairline-2, rgba(0,0,0,0.12))",
  accent: "var(--accent, #065ec6)",
};

export default function Admin() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<ListItem | null>(null);
  // Apple Notes 3-column model: sidebar = FOLDERS, body = the selected folder's
  // list (with search), then the editor. selectedFolder drives the list.
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  // The folder (group) a given item id belongs to.
  const folderOf = useCallback(
    (id: string) => groups?.find((g) => g.items.some((it) => it.id === id))?.group ?? "",
    [groups],
  );
  // sidebar show/hide (HIG: toolbar toggle, leading edge; persist)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return sessionStorage.getItem("cms.sidebar") !== "0";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem("cms.sidebar", sidebarOpen ? "1" : "0");
    } catch {
      /* private mode */
    }
  }, [sidebarOpen]);
  // Cmd-Ctrl-S toggles the sidebar (macOS convention)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSidebarOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Resizable editor | preview split: splitPct is the editor's share of the row.
  const [splitPct, setSplitPct] = useState(() => {
    try {
      const v = Number(sessionStorage.getItem("cms.split"));
      return v >= 20 && v <= 80 ? v : 50;
    } catch {
      return 50;
    }
  });
  const [dragging, setDragging] = useState(false);
  const splitRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      sessionStorage.setItem("cms.split", String(Math.round(splitPct)));
    } catch {
      /* private mode */
    }
  }, [splitPct]);
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const el = splitRowRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSplitPct(Math.max(20, Math.min(80, ((e.clientX - r.left) / r.width) * 100)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging]);

  // auth (open on the dev server; GitHub sign-in in production)
  const [authNeeded, setAuthNeeded] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const [hasGithub, setHasGithub] = useState(false);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [envKnown, setEnvKnown] = useState(false);
  // On the live site (prod), every save COMMITS via the serverless backend (rebuild
  // ~1-2 min); on dev it writes the working tree instantly. Set from /api/cms/auth.
  const [prod, setProd] = useState(false);

  // editor state
  const [type, setType] = useState<DocType>("md");
  const [frontmatter, setFrontmatter] = useState("");
  const [body, setBody] = useState("");
  const [raw, setRaw] = useState("");
  const [q, setQ] = useState<MdFields>({ title: "", desc: "", kicker: "", date: "", cover: "", tags: [] });
  const [tagsInput, setTagsInput] = useState("");
  const [home, setHome] = useState<HomeBuf | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // preview (double-buffered: load into the hidden frame, swap on load, so the
  // visible frame never goes blank -> no white flash on save/reload)
  const [showPreview, setShowPreview] = useState(true);
  const [frameA, setFrameA] = useState("about:blank");
  const [frameB, setFrameB] = useState("about:blank");
  const [active, setActive] = useState<"A" | "B" | null>(null);
  const activeRef = useRef<"A" | "B" | null>(null);
  const pendingFrame = useRef<"A" | "B" | null>(null);
  const previewCounter = useRef(0);

  const baseline = useRef("");
  const restored = useRef(false);
  const bootSynced = useRef(false);
  // content-hash of the on-disk file when this doc was loaded; sent with each
  // save so the server can reject a write whose base moved (a live-site edit
  // pulled in underneath us), preventing a stale buffer from clobbering it.
  const baseSha = useRef("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // set when the open doc's file changed underneath the editor (a background
  // pull, or a rejected stale save). Freezes auto-save until the user reloads.
  const [staleBase, setStaleBase] = useState(false);
  // media in the selected item's folder: upload, insert into the body, remove
  const [uploading, setUploading] = useState(false);
  const [assets, setAssets] = useState<string[]>([]);
  const [assetBusy, setAssetBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // A page that exists in the repo but not yet in the deployed build: the
  // preview would otherwise fall back to a listing and look like the edit
  // silently did nothing.
  const [notLiveYet, setNotLiveYet] = useState(false);
  // where the next upload goes: the cover, or inline at the body's cursor
  const uploadTarget = useRef<"cover" | "body">("cover");
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = selected ? previewFor(selected.id) : null;
  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = previewUrl;

  const setActiveBoth = useCallback((w: "A" | "B") => {
    activeRef.current = w;
    setActive(w);
  }, []);
  // Load the page into whichever frame is hidden; swap to it once it has painted.
  const loadPreview = useCallback((url: string) => {
    if (!url) return;
    // Ask whether the route is actually in the deployed build. A newly created
    // page 404s until the rebuild lands, and the SPA answers a 404 by showing
    // its listing, which reads as "my page is missing" rather than "not yet".
    fetch(url, { method: "HEAD" })
      .then((r) => setNotLiveYet(r.status === 404))
      .catch(() => setNotLiveYet(false));
    previewCounter.current += 1;
    const src = url + (url.includes("?") ? "&" : "?") + "cmsPreview=1&cms=" + previewCounter.current;
    const target: "A" | "B" = activeRef.current === "A" ? "B" : "A";
    pendingFrame.current = target;
    if (target === "A") setFrameA(src);
    else setFrameB(src);
  }, []);
  const onFrameLoad = useCallback(
    (w: "A" | "B") => {
      if (pendingFrame.current === w) {
        setActiveBoth(w);
        pendingFrame.current = null;
      }
    },
    [setActiveBoth],
  );
  // (re)load when the page changes or the preview is turned on
  useEffect(() => {
    if (showPreview && previewUrl) loadPreview(previewUrl);
  }, [previewUrl, showPreview, loadPreview]);

  // current serialized doc, for dirty-tracking + save
  const current = useMemo(() => {
    if (type === "home") return JSON.stringify(home);
    if (type === "md") return JSON.stringify({ frontmatter, body });
    return JSON.stringify({ raw });
  }, [type, frontmatter, body, raw, home]);
  const dirty = selected != null && current !== baseline.current;

  // ---- live preview streaming ----
  // Push the current draft into the preview iframe over postMessage so it
  // re-renders in place as you type, with NO save and NO commit. This is what
  // makes the preview reflect edits on prod (the live site has no dev server to
  // render drafts) as well as dev. The previewed page (cmsPreview.ts) re-parses
  // the draft with the app's own parsers.
  const previewWin = useRef<Window | null>(null);
  const draftPayload = useCallback((): Record<string, unknown> => {
    if (type === "home" && home) {
      return {
        about: { frontmatter: home.aboutFrontmatter, body: home.aboutBody },
        home: {
          proof: home.proof,
          recognition: home.recognition.map((g) => ({ label: g.label, items: recTextToItems(g.items) })),
          philosophy: home.philosophy.split("\n").map((s) => s.trim()).filter(Boolean),
        },
      };
    }
    if (type === "md") return { frontmatter, body };
    return { raw };
  }, [type, home, frontmatter, body, raw]);

  const postDraft = useCallback(
    (win?: Window | null) => {
      const target = win || previewWin.current;
      if (!target || !selected) return;
      try {
        target.postMessage(
          { type: "cms-draft", id: selected.id, previewPath: previewFor(selected.id), payload: draftPayload() },
          window.location.origin,
        );
      } catch {
        /* frame navigated away */
      }
    },
    [selected, draftPayload],
  );

  // A freshly-loaded preview frame announces itself; stream it the current draft.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { type?: string })?.type === "cms-preview-ready" && e.source) {
        previewWin.current = e.source as Window;
        postDraft(e.source as Window);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [postDraft]);

  // Stream the draft on every edit (debounced), so the preview tracks your typing.
  useEffect(() => {
    if (!showPreview || !selected) return;
    const t = window.setTimeout(() => postDraft(), 80);
    return () => window.clearTimeout(t);
  }, [current, showPreview, selected, postDraft]);

  const loadList = useCallback(() => {
    fetch("/api/cms/list")
      .then((r) => {
        if (r.status === 401) {
          setAuthNeeded(true);
          setAuthRequired(true);
          return null;
        }
        if (!r.ok) return Promise.reject(new Error(String(r.status)));
        return r.json();
      })
      .then((d) => {
        if (d) {
          setGroups(d.groups);
          setAuthNeeded(false);
        }
      })
      .catch(() =>
        setLoadError(
          "The editor runs only on your local dev server. The save API is not part of the public site.",
        ),
      );
  }, []);
  useEffect(() => {
    loadList();
  }, [loadList]);

  const signOut = useCallback(() => {
    fetch("/api/cms/logout", { method: "POST" }).finally(() => {
      setSelected(null);
      setGroups(null);
      setAuthNeeded(true);
    });
  }, []);

  const publish = useCallback(() => {
    if (publishing) return;
    if (!window.confirm(`Publish all saved changes to ${SITE.title}? It goes live in about 1-2 minutes.`)) return;
    setPublishing(true);
    setPublishMsg(null);
    fetch("/api/cms/publish", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok)
          setPublishMsg({
            kind: "ok",
            text: d.changed
              ? `Published ${d.changed} change${d.changed === 1 ? "" : "s"}. Live in ~1-2 min.`
              : "Pushed pending changes. Live in ~1-2 min.",
          });
        else if (d.nothing) setPublishMsg({ kind: "ok", text: "Nothing new to publish." });
        else setPublishMsg({ kind: "err", text: d.error || "Publish failed." });
      })
      .catch(() => setPublishMsg({ kind: "err", text: "Publish failed." }))
      .finally(() => setPublishing(false));
  }, [publishing]);

  // who we are, and which sign-in routes this deployment offers
  useEffect(() => {
    fetch("/api/cms/auth")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setHasGithub(!!d.github);
          setSignedInAs(d.user?.login ?? null);
          setAuthRequired(!!d.required);
          if (d.env === "prod") setProd(true);
          setEnvKnown(true);
        }
      })
      .catch(() => {});
  }, []);

  const jsonError = useMemo(() => {
    if (type !== "json" || !raw.trim()) return null;
    try {
      JSON.parse(raw);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [type, raw]);

  const open = useCallback(
    (item: ListItem) => {
      if (dirty && !window.confirm("Discard unsaved changes?")) return;
      setMsg(null);
      fetch(`/api/cms/read?id=${encodeURIComponent(item.id)}`)
        .then((r) => r.json())
        .then((d) => {
          setSelected(item);
          setAssets([]);
          loadAssets(item.id);
          setSelectedFolder((f) => f || folderOf(item.id));
          baseSha.current = d.baseSha || "";
          setStaleBase(false);
          try {
            sessionStorage.setItem("cms.lastId", item.id);
          } catch {
            /* private mode: restore-on-reload just won't work */
          }
          setType(d.type);
          setShowAdvanced(false);
          if (d.type === "home") {
            const buf: HomeBuf = {
              aboutFrontmatter: d.about.frontmatter || "",
              aboutBody: d.about.body || "",
              about: {
                headerName: d.about.fields.headerName || "",
                heroTitle: d.about.fields.heroTitle || "",
                role: d.about.fields.role || "",
                eyebrow: d.about.fields.eyebrow || "",
                tagline: d.about.fields.tagline || "",
                email: d.about.fields.email || "",
                locations: (d.about.fields.locations || []).join(", "),
              },
              proof: d.home.proof || [],
              recognition: (d.home.recognition || []).map((g: { label: string; items: { text: string; href: string }[] }) => ({
                label: g.label,
                items: recItemsToText(g.items || []),
              })),
              philosophy: (d.home.philosophy || []).join("\n"),
            };
            setHome(buf);
            baseline.current = JSON.stringify(buf);
          } else if (d.type === "md") {
            setFrontmatter(d.frontmatter || "");
            setBody(d.body || "");
            setRaw("");
            const f: MdFields = d.fields || { title: "", desc: "", kicker: "", date: "", cover: "", tags: [] };
            setQ(f);
            setTagsInput((f.tags || []).join(", "));
            baseline.current = JSON.stringify({ frontmatter: d.frontmatter || "", body: d.body || "" });
          } else {
            setRaw(d.raw || "");
            setFrontmatter("");
            setBody("");
            baseline.current = JSON.stringify({ raw: d.raw || "" });
          }
        })
        .catch(() => setMsg({ kind: "err", text: "Could not load that file." }));
    },
    [dirty, folderOf],
  );

  // Pull edits made on the live site into this dev working tree, so
  // dev reflects prod. Server only syncs a clean tree (never clobbers unpublished
  // dev edits). auto=true = silent background sync on open.
  const sync = useCallback(
    (auto?: boolean) => {
      if (syncing || prod) return;
      setSyncing(true);
      if (!auto) setPublishMsg(null);
      fetch("/api/cms/sync", { method: "POST" })
        .then((r) => r.json())
        .then((d) => {
          if (!d.ok) {
            if (!auto) setPublishMsg({ kind: "err", text: d.error || "Sync failed." });
            return;
          }
          if (d.updated) {
            loadList();
            if (selected) open(selected); // reload the open doc with the live version
          }
          if (!auto)
            setPublishMsg({
              kind: "ok",
              text: d.updated ? `Synced from the live site (${d.sha}).` : "Already up to date with the live site.",
            });
        })
        .catch(() => {
          if (!auto) setPublishMsg({ kind: "err", text: "Sync failed." });
        })
        .finally(() => setSyncing(false));
    },
    [syncing, prod, loadList, open, selected],
  );

  const refreshPreview = useCallback(() => {
    // The in-admin preview iframe updates live via the draft stream (no reload).
    // This only nudges OTHER open dev tabs (a plain browsing tab) to reload so
    // they pick up the just-saved content.
    try {
      const ch = new BroadcastChannel("cms");
      ch.postMessage({ type: "reload" });
      ch.close();
    } catch {
      /* BroadcastChannel unsupported */
    }
  }, []);

  const save = useCallback(() => {
    if (!selected || saving) return;
    if (staleBase) return; // the file moved underneath us; must Load live version first
    if (type === "json" && jsonError) {
      setMsg({ kind: "err", text: `Invalid JSON: ${jsonError}` });
      return;
    }
    setSaving(true);
    setMsg(null);
    // Same shape the live preview streams, so what you see is exactly what saves.
    const payload: Record<string, unknown> = {
      id: selected.id,
      ...draftPayload(),
      expectedBase: baseSha.current, // optimistic-concurrency guard
    };
    fetch("/api/cms/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (r) => ({ status: r.status, d: await r.json() }))
      .then(({ status, d }) => {
        if (d.ok) {
          baseline.current = current;
          if (d.baseSha) baseSha.current = d.baseSha; // advance to the just-written version
          if (prod) {
            // The save just committed -> Vercel rebuild. Don't reload the preview:
            // the live page shows OLD content for ~1-2 min, so a reload would look
            // like nothing happened.
            setMsg({ kind: "ok", text: "Saved & publishing. Live in ~1-2 min." });
          } else {
            setMsg({ kind: "ok", text: "Saved" });
            refreshPreview();
          }
        } else if (status === 409 || d.staleBase) {
          // The live site changed this page since we loaded it. Freeze auto-save
          // and let the user load the live version (their text stays in the box).
          setStaleBase(true);
          setMsg({ kind: "err", text: "The live site changed this page. Load the live version, then re-apply your edit." });
        } else {
          setMsg({ kind: "err", text: d.error || "Save failed." });
        }
      })
      .catch(() => setMsg({ kind: "err", text: "Save failed (is the dev server running?)." }))
      .finally(() => setSaving(false));
  }, [prod, selected, saving, staleBase, type, jsonError, draftPayload, current, refreshPreview]);

  // The media already in this item's folder. Read after each change so the
  // list is the repo's answer rather than a guess about what a write did.
  const loadAssets = useCallback((id: string) => {
    fetch(`/api/cms/assets?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAssets(d?.ok ? d.assets || [] : []))
      .catch(() => setAssets([]));
  }, []);

  /** Put markdown at the body's cursor, or at the end when it is not focused. */
  const insertIntoBody = useCallback((markdown: string) => {
    const el = bodyRef.current;
    setBody((prev) => {
      const at = el && document.activeElement === el ? el.selectionStart : prev.length;
      const before = prev.slice(0, at).replace(/\s*$/, "");
      const after = prev.slice(at).replace(/^\s*/, "");
      return `${before}${before ? "\n\n" : ""}${markdown}${after ? "\n\n" : ""}${after}`;
    });
    setMsg({ kind: "ok", text: "Added to the body. Save & publish to make it live." });
  }, []);

  // Upload a file into the item's folder. On dev the server runs the WebP/WebM
  // pipeline; on prod it commits the file as given. Either way it lands in the
  // folder, and goes to the cover or the body depending on which button asked.
  const onUploadFile = useCallback(
    (file: File) => {
      if (!selected) return;
      const target = uploadTarget.current;
      setUploading(true);
      setMsg(null);
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = String(reader.result || "").split(",")[1] || "";
        fetch("/api/cms/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: selected.id, filename: file.name, contentBase64: b64 }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (!d.ok) {
              setMsg({ kind: "err", text: d.error || "Upload failed." });
              return;
            }
            const name = d.name || String(d.path || "").split("/").pop() || "";
            if (target === "cover") {
              setFrontmatter((fm) => setScalar(fm, "cover", d.path));
              setQ((prev) => ({ ...prev, cover: d.path }));
            } else {
              insertIntoBody(d.markdown || `![](./${name})`);
            }
            loadAssets(selected.id);
            window.setTimeout(() => {
              if (previewUrlRef.current) loadPreview(previewUrlRef.current);
            }, 500);
          })
          .catch(() => setMsg({ kind: "err", text: "Upload failed." }))
          .finally(() => setUploading(false));
      };
      reader.onerror = () => {
        setMsg({ kind: "err", text: "Could not read that file." });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    },
    [selected, loadPreview, loadAssets, insertIntoBody],
  );

  /** Remove one file from the item's folder. It stays referenced in the body
      if it was embedded there, so say so rather than editing prose silently. */
  const removeAsset = useCallback(
    async (name: string) => {
      if (!selected) return;
      if (!window.confirm(`Delete ${name} from this item? This cannot be undone.`)) return;
      setAssetBusy(name);
      try {
        const r = await fetch("/api/cms/asset/delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: selected.id, name }),
        }).then((res) => res.json());
        if (!r.ok) {
          setMsg({ kind: "err", text: r.error || "Could not delete that file." });
          return;
        }
        loadAssets(selected.id);
        setMsg({
          kind: "ok",
          text: body.includes(name)
            ? `Deleted ${name}. The body still links to it, so remove that too.`
            : `Deleted ${name}.`,
        });
      } finally {
        setAssetBusy(null);
      }
    },
    [selected, loadAssets, body],
  );

  /** Remove the whole item: its folder, and the preview clip keyed to it. */
  const deleteItem = useCallback(async () => {
    if (!selected) return;
    const label = selected.title || selected.id;
    if (!window.confirm(`Delete "${label}"?\n\nThis removes the page and its media, and cannot be undone.`)) return;
    setDeleting(true);
    try {
      const r = await fetch("/api/cms/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id }),
      }).then((res) => res.json());
      if (!r.ok) {
        setMsg({ kind: "err", text: r.error || "Could not delete that item." });
        return;
      }
      setSelected(null);
      loadList();
    } finally {
      setDeleting(false);
    }
  }, [selected, loadList]);

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !(e.metaKey && e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // Auto-save: debounce after you stop typing; onBlur below also flushes.
  useEffect(() => {
    if (prod) return; // on prod each save commits (rebuild) -> only the explicit button
    if (!selected || !dirty || saving) return;
    if (staleBase) return; // the file moved underneath us; wait for the user to reload
    if (type === "json" && jsonError) return;
    const t = window.setTimeout(() => save(), 800);
    return () => window.clearTimeout(t);
  }, [prod, selected, dirty, saving, staleBase, type, jsonError, current, save]);

  // Live-site edits pulled in by the dev server's background auto-pull: keep the
  // editor in step. If the open doc's file changed and we have no unsaved edits,
  // reload it from disk (now the live version). If we DO have unsaved edits, mark
  // the base stale so a save can't blindly overwrite the live change.
  useEffect(() => {
    const hot = (import.meta as unknown as { hot?: { on: (e: string, cb: (d: unknown) => void) => void; off: (e: string, cb: (d: unknown) => void) => void } }).hot;
    if (!hot) return;
    const onPulled = () => {
      if (!selected) return;
      if (dirty) setStaleBase(true);
      else open(selected);
    };
    hot.on("cms:pulled", onPulled);
    return () => hot.off("cms:pulled", onPulled);
  }, [selected, dirty, open]);

  // Restore the last-edited page across reloads, so a save never strands you.
  useEffect(() => {
    if (!groups || restored.current || selected) return;
    restored.current = true;
    const all = groups.flatMap((g) => g.items);
    // deep link from the public "Edit page" button: /admin?at=/blog/<slug>
    let at: string | null = null;
    try {
      at = new URLSearchParams(window.location.search).get("at");
    } catch {
      /* ignore */
    }
    if (at) {
      const hit = all.find((i) => previewFor(i.id) === at);
      if (hit) {
        open(hit);
        return;
      }
    }
    // otherwise restore the last-edited page
    let lastId: string | null = null;
    try {
      lastId = sessionStorage.getItem("cms.lastId");
    } catch {
      /* ignore */
    }
    if (lastId) {
      const hit = all.find((i) => i.id === lastId);
      if (hit) open(hit);
    }
  }, [groups, selected, open]);

  // On dev, once we know the env and we're signed in, pull any edits made on the
  // live site so dev opens up-to-date. Silent + best-effort (skipped if you have
  // unpublished dev edits). Runs once per editor load.
  useEffect(() => {
    if (bootSynced.current) return;
    if (!envKnown || prod || authNeeded || groups == null) return;
    bootSynced.current = true;
    sync(true);
  }, [envKnown, prod, authNeeded, groups, sync]);

  useEffect(() => {
    document.title = `Edit · ${SITE.title}`;
  }, []);

  const patchScalar = (key: keyof MdFields, value: string) => {
    setQ((p) => ({ ...p, [key]: value }));
    setFrontmatter((fm) => setScalar(fm, key, value));
  };
  const patchTags = (value: string) => {
    setTagsInput(value);
    const items = value.split(",").map((s) => s.trim()).filter(Boolean);
    setQ((p) => ({ ...p, tags: items }));
    setFrontmatter((fm) => setList(fm, "tags", items));
  };

  // The selected folder's items, filtered by the list's search box.
  const currentItems = useMemo(() => {
    const g = groups?.find((gr) => gr.group === selectedFolder);
    if (!g) return [];
    const f = filter.trim().toLowerCase();
    if (!f) return g.items;
    return g.items.filter((i) => i.title.toLowerCase().includes(f) || i.id.toLowerCase().includes(f));
  }, [groups, selectedFolder, filter]);

  // Split the folder into what the site publishes as a card and what it does
  // not, preserving the list order within each part.
  const cardItems = useMemo(
    () =>
      currentItems
        .map((item) => ({ item, media: mediaForItem(item.id) }))
        .filter((x): x is { item: ListItem; media: LabMedia } => !!x.media),
    [currentItems],
  );
  const rowItems = useMemo(() => currentItems.filter((i) => !mediaForItem(i.id)), [currentItems]);

  // ---- create a new item in the selected folder ----
  // Only the content folders can take a new item: "Pages" holds the composite
  // Home doc, which is not a collection you add to.
  const newKind = selectedFolder ? FOLDER_KIND[selectedFolder] : undefined;

  const createItem = useCallback(async () => {
    if (!newKind) return;
    const title = newTitle.trim();
    if (!title) {
      setCreateMsg({ kind: "err", text: "A title is required." });
      return;
    }
    setCreating(true);
    setCreateMsg(null);
    try {
      const r = await fetch("/api/cms/new", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: newKind, title }),
      });
      const d = await r.json();
      if (!d.ok) {
        setCreateMsg({ kind: "err", text: d.error || "Could not create that." });
        return;
      }
      // Reload so the new row exists, then open it: the author lands in the
      // editor on the stub instead of hunting for it in the list.
      loadList();
      setCreateMsg({
        kind: "ok",
        text: prod
          ? `Created ${d.slug}. Live in ~1-2 min.`
          : `Created ${d.slug}. Publish when you are ready.`,
      });
      setNewTitle("");
      open({ id: d.id, title, type: "md" });
    } catch (e) {
      setCreateMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setCreating(false);
    }
  }, [newKind, newTitle, loadList, open, prod]);

  // Default the selected folder once the list loads (to the open doc's folder if
  // one is restored, else the first folder).
  useEffect(() => {
    if (!groups || !groups.length || selectedFolder) return;
    setSelectedFolder((selected && folderOf(selected.id)) || groups[0].group);
  }, [groups, selected, selectedFolder, folderOf]);

  if (loadError) {
    return (
      <div className="applecms" style={{ ...styles.full, alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
        <div style={{ maxWidth: 460 }}>
          <h1 style={{ font: "600 22px/1.25 var(--ac-font-text)", letterSpacing: "0.016em", margin: "0 0 10px", color: "var(--ac-label)" }}>Editor</h1>
          <p style={{ font: "400 17px/1.5 var(--ac-font-text)", letterSpacing: "-0.025em", color: "var(--ac-label-2)", margin: 0 }}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (authNeeded) {
    return (
      <div className="applecms" style={{ ...styles.full, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <style>{hoverCss}</style>
        <div style={{ width: 300 }}>
          <h1 style={{ font: "600 22px/1.25 var(--ac-font-text)", letterSpacing: "0.016em", margin: "0 0 14px", color: "var(--ac-label)" }}>Sign in</h1>

          {hasGithub ? (
            <>
              <a
                href={`/api/cms/auth/github/start?next=${encodeURIComponent(location.pathname)}`}
                className="cmsx-save"
                style={{ ...styles.saveBtn, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none", boxSizing: "border-box" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
                </svg>
                Sign in with GitHub
              </a>
              <p style={{ font: "400 13px/1.45 var(--ac-font-text)", color: "var(--ac-label-2)", textAlign: "center", margin: "14px 0 0" }}>
                Editing is open to members of the project's GitHub organization.
              </p>
            </>
          ) : (
            <p style={{ font: "400 15px/1.5 var(--ac-font-text)", color: "var(--ac-label-2)", margin: 0 }}>
              GitHub sign-in is not configured on this deployment, so there is no
              way to sign in. Set CMS_GITHUB_CLIENT_ID and CMS_GITHUB_CLIENT_SECRET.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="applecms" style={styles.full}>
      <style>{hoverCss}</style>

      {/* window toolbar: leading = sidebar toggle + a contextual back (Apple: item
          -> list -> site); trailing = the document's actions when editing. */}
      <header className="ac-toolbar ac-chrome">
        <button className="ac-icon-btn" onClick={() => setSidebarOpen((s) => !s)} title="Show/Hide Sidebar (Ctrl-Cmd-S)" aria-label="Toggle sidebar">
          <SidebarIcon />
        </button>
        {selected ? (
          <button
            className="ac-btn ac-btn-plain ac-back"
            onClick={() => {
              if (!dirty || window.confirm("Discard unsaved changes?")) setSelected(null);
            }}
            title="Back to the list"
          >
            <ChevronLeftIcon />
            {folderOf(selected.id) || "Back"}
          </button>
        ) : (
          <button className="ac-btn ac-btn-plain ac-back" onClick={() => { window.location.href = "/"; }} title="Leave the editor and view the site">
            <ChevronLeftIcon />
            {SITE.title}
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0, marginLeft: 4 }}>
          <div className="ac-toolbar-title">{selected ? selected.title : selectedFolder}</div>
        </div>
        {selected && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {msg && (
              <span style={{ font: "500 13px/1 var(--ac-font-text)", letterSpacing: "-0.006em", color: msg.kind === "ok" ? "var(--ac-accent)" : "var(--ac-red)" }}>{msg.text}</span>
            )}
            {dirty && !msg && <span style={{ font: "400 13px/1 var(--ac-font-text)", color: "var(--ac-label-2)" }}>Unsaved</span>}
            {staleBase && (
              <button className="ac-btn ac-btn-gray" onClick={() => open(selected)}>
                Load live version
              </button>
            )}
            {previewUrl && (
              <button className="ac-btn ac-btn-plain" onClick={() => setShowPreview((s) => !s)}>
                {showPreview ? "Hide preview" : "Show preview"}
              </button>
            )}
            {previewUrl && (
              <a className="ac-btn ac-btn-plain" href={previewUrl} target="_blank" rel="noreferrer" title="Open the live page in a new browser tab">
                Open live page ↗
              </a>
            )}
            {!prod && (
              <button
                className="ac-btn ac-btn-gray"
                onClick={() => sync(false)}
                disabled={publishing || syncing || dirty}
                title={dirty ? "Publish your edits first, then sync." : "Pull edits made on the live site into dev."}
              >
                {syncing ? "Syncing..." : "Sync"}
              </button>
            )}
            <button
              className={prod ? "ac-btn ac-btn-filled" : "ac-btn ac-btn-gray"}
              onClick={save}
              disabled={!dirty || saving || staleBase || (type === "json" && !!jsonError)}
            >
              {saving ? (prod ? "Publishing..." : "Saving...") : prod ? "Save & publish" : "Save"}
            </button>
            {!prod && (
              <button className="ac-btn ac-btn-filled" onClick={publish} disabled={publishing || syncing}>
                {publishing ? "Publishing..." : "Publish"}
              </button>
            )}
            {selected && /^data\/(blog|hardware|games)\//.test(selected.id) && (
              <button
                className="ac-btn ac-btn-plain ac-danger"
                onClick={deleteItem}
                disabled={deleting}
                title="Delete this page and its media"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            )}
            <button
              className="ac-icon-btn"
              title={
                prod
                  ? "Save & publish commits your change and rebuilds the site. It goes live about 1-2 minutes later."
                  : "Save writes your edit instantly. Publish pushes it to the live site (live about 1-2 minutes after)."
              }
              aria-label="About saving and publishing"
            >
              <HelpIcon />
            </button>
          </div>
        )}
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* sidebar: source list */}
        <aside
          className="ac-sidebar ac-chrome"
          style={{ width: sidebarOpen ? 260 : 0, flex: sidebarOpen ? "0 0 260px" : "0 0 0px", overflow: "hidden", transition: "width .2s ease, flex-basis .2s ease" }}
        >
          <div className="ac-list" style={{ paddingTop: 10 }}>
            {!groups && <div style={styles.dim}>Loading...</div>}
            {groups?.map((g) => (
              <button
                key={g.group}
                className={selectedFolder === g.group ? "ac-folder ac-folder-on" : "ac-folder"}
                onClick={() => {
                  if (selected && dirty && !window.confirm("Discard unsaved changes?")) return;
                  setSelectedFolder(g.group);
                  setSelected(null);
                  setFilter("");
                }}
              >
                <span className="ac-folder-icon">
                  <FolderGlyph />
                </span>
                <span className="ac-folder-name">{g.group}</span>
                <span className="ac-badge">{g.items.length}</span>
              </button>
            ))}
          </div>
          {publishMsg && (
            <div style={{ font: "500 12px/1.35 var(--ac-font-text)", color: publishMsg.kind === "ok" ? "var(--ac-accent)" : "var(--ac-red)", padding: "0 12px 6px" }}>{publishMsg.text}</div>
          )}
          <div className="ac-account">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="ac-avatar" />
            <span className="ac-account-name">{SITE.title}</span>
            {signedInAs && (
              <span
                title={`Signed in as ${signedInAs}`}
                style={{ font: "500 12.5px/1 var(--ac-font-text)", color: "var(--ac-label-2)", marginRight: 8 }}
              >
                {signedInAs}
              </span>
            )}
            {authRequired && (
              <button className="ac-icon-btn" onClick={signOut} title="Sign out" aria-label="Sign out">
                <SignOutIcon />
              </button>
            )}
          </div>
        </aside>

        {/* editor + preview */}
        <main style={styles.main}>
          {!selected ? (
            <div className="ac-listview">
              <div className="ac-listview-head">
                <div className="ac-listview-title">{selectedFolder || "Content"}</div>
                <div className="ac-listview-count">
                  {currentItems.length} {currentItems.length === 1 ? "item" : "items"}
                </div>
                {newKind && (
                  <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
                    <input
                      style={{ ...styles.input, width: 220, padding: "6px 10px", font: "400 13px/1.3 var(--ac-font-text)" }}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !creating) createItem();
                      }}
                      placeholder={`New ${NEW_LABEL[newKind]} title`}
                      aria-label={`Title for a new ${NEW_LABEL[newKind]}`}
                    />
                    <button
                      className="cmsx-ghost"
                      style={styles.ghostBtn}
                      disabled={creating || !newTitle.trim()}
                      onClick={createItem}
                    >
                      {creating ? "Creating..." : "Add"}
                    </button>
                  </div>
                )}
              </div>
              {createMsg && (
                <div
                  style={{
                    font: "500 12px/1.4 var(--ac-font-text)",
                    color: createMsg.kind === "ok" ? "var(--ac-accent)" : "var(--ac-red)",
                    padding: "0 20px 8px",
                  }}
                >
                  {createMsg.text}
                </div>
              )}
              <div className="ac-search-wrap" style={{ margin: "0 20px 10px" }}>
                <span className="ac-search-icon">
                  <SearchIcon />
                </span>
                <input className="ac-search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search" />
              </div>
              <div className="ac-notelist">
                {/* Items that are published as cards on the site are shown as
                    that same card here, so the editor's list and the live page
                    read as one thing. Anything without a card (Pages, sources,
                    a folder not yet built) keeps the plain row. */}
                {!!cardItems.length && (
                  <div className="tv-grid">
                    {cardItems.map(({ item, media }) => (
                      <SpatialCard
                        key={item.id}
                        media={media}
                        onOpen={(m) => {
                          const hit = cardItems.find((c) => c.media === m);
                          if (hit) open(hit.item);
                        }}
                      />
                    ))}
                  </div>
                )}
                {rowItems.map((it) => (
                  <button key={it.id} className="ac-noterow" onClick={() => open(it)} title={it.id}>
                    <span className="ac-noterow-title">{it.title}</span>
                    {it.sub && <span className="ac-noterow-sub">{it.sub}</span>}
                  </button>
                ))}
                {!currentItems.length && (
                  <div style={{ ...styles.dim, padding: "24px 20px" }}>{filter ? "No matches." : "Nothing here yet."}</div>
                )}
              </div>
            </div>
          ) : (
            <div ref={splitRowRef} style={styles.splitRow}>
              <div
                style={{ ...styles.editorScroll, flex: showPreview && previewUrl ? `0 0 ${splitPct}%` : "1 1 0" }}
                onBlur={() => {
                  if (!prod && dirty && !(type === "json" && jsonError)) save();
                }}
              >
                <div style={{ maxWidth: 820, margin: "0 auto" }}>
                  {type === "home" && home && <HomeFields home={home} setHome={setHome} />}

                  {type === "md" && (
                    <>
                      <Field label="Title">
                        <input style={styles.input} value={q.title} onChange={(e) => patchScalar("title", e.target.value)} />
                      </Field>
                      <Field label="Description">
                        <textarea
                          style={{ ...styles.input, minHeight: 56, resize: "vertical" }}
                          value={q.desc}
                          onChange={(e) => patchScalar("desc", e.target.value)}
                        />
                      </Field>
                      <div style={{ display: "flex", gap: 14 }}>
                        <Field label="Kicker" grow>
                          <input style={styles.input} value={q.kicker} onChange={(e) => patchScalar("kicker", e.target.value)} />
                        </Field>
                        <Field label="Date">
                          <input style={{ ...styles.input, width: 150 }} value={q.date} onChange={(e) => patchScalar("date", e.target.value)} placeholder="YYYY-MM-DD" />
                        </Field>
                      </div>
                      <Field label="Tags (comma-separated)">
                        <input style={styles.input} value={tagsInput} onChange={(e) => patchTags(e.target.value)} />
                      </Field>
                      {selected && /^data\/(blog|hardware|games)\//.test(selected.id) && (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) onUploadFile(f);
                              e.target.value = "";
                            }}
                          />
                          <Field label="Cover image / video">
                            <input
                              style={styles.input}
                              value={q.cover}
                              onChange={(e) => patchScalar("cover", e.target.value)}
                              placeholder="./cover.webp, or /previews/slug.webp"
                            />
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                              <button
                                className="cmsx-ghost"
                                style={{ ...styles.ghostBtn, opacity: uploading ? 0.6 : 1 }}
                                disabled={uploading}
                                onClick={() => {
                                  uploadTarget.current = "cover";
                                  fileInputRef.current?.click();
                                }}
                              >
                                {uploading ? "Uploading..." : "Upload a cover"}
                              </button>
                              {q.cover && (
                                <button className="cmsx-ghost" style={styles.ghostBtn} onClick={() => patchScalar("cover", "")}>
                                  Clear
                                </button>
                              )}
                            </div>
                          </Field>

                          <Field label="Media in this page">
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: assets.length ? 10 : 0, flexWrap: "wrap" }}>
                              <button
                                className="cmsx-ghost"
                                style={{ ...styles.ghostBtn, opacity: uploading ? 0.6 : 1 }}
                                disabled={uploading}
                                onClick={() => {
                                  uploadTarget.current = "body";
                                  fileInputRef.current?.click();
                                }}
                              >
                                {uploading ? "Uploading..." : "Add image or video to the body"}
                              </button>
                              <span style={{ font: "400 11.5px/1.4 var(--ac-font-text)", color: "var(--ac-label-2)" }}>
                                {prod ? "Committed as uploaded. Up to 3 MB." : "Runs the WebP/WebM pipeline."}
                              </span>
                            </div>
                            {assets.map((name) => {
                              const used = body.includes(name);
                              return (
                                <div
                                  key={name}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "7px 0",
                                    borderTop: "1px solid var(--ac-separator)",
                                  }}
                                >
                                  <span
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      font: "400 13px/1.3 var(--ac-font-text)",
                                      color: "var(--ac-label)",
                                    }}
                                    title={name}
                                  >
                                    {name}
                                  </span>
                                  <span style={{ font: "400 11.5px/1 var(--ac-font-text)", color: "var(--ac-label-2)" }}>
                                    {used ? "in the body" : "unused"}
                                  </span>
                                  <button
                                    className="ac-btn ac-btn-plain"
                                    onClick={() => insertIntoBody(`![](./${name})`)}
                                    title="Insert at the cursor in the body"
                                  >
                                    Insert
                                  </button>
                                  <button
                                    className="ac-btn ac-btn-plain ac-danger"
                                    disabled={assetBusy === name}
                                    onClick={() => removeAsset(name)}
                                  >
                                    {assetBusy === name ? "..." : "Delete"}
                                  </button>
                                </div>
                              );
                            })}
                            {!assets.length && (
                              <div style={{ font: "400 12.5px/1.4 var(--ac-font-text)", color: "var(--ac-label-2)" }}>
                                Nothing uploaded to this page yet.
                              </div>
                            )}
                          </Field>
                        </>
                      )}
                      <Field label="Body (markdown)">
                        <textarea
                          ref={bodyRef}
                          style={{ ...styles.input, ...styles.mono, minHeight: 320, resize: "vertical" }}
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                        />
                      </Field>
                      <button className="cmsx-disc" style={styles.disclosure} onClick={() => setShowAdvanced((s) => !s)}>
                        {showAdvanced ? "▾" : "▸"} Advanced: raw frontmatter (gallery, links, colors...)
                      </button>
                      {showAdvanced && (
                        <Field label="Frontmatter (YAML) · source of truth on save">
                          <textarea
                            style={{ ...styles.input, ...styles.mono, minHeight: 200, resize: "vertical" }}
                            value={frontmatter}
                            onChange={(e) => setFrontmatter(e.target.value)}
                          />
                        </Field>
                      )}
                    </>
                  )}

                  {type === "json" && (
                    <Field label={jsonError ? `JSON · ${jsonError}` : "JSON"}>
                      <textarea
                        style={{ ...styles.input, ...styles.mono, minHeight: 520, resize: "vertical", borderColor: jsonError ? "#c0392b" : V.line }}
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                      />
                    </Field>
                  )}

                  {type === "raw" && (
                    <>
                      <div style={styles.warn}>
                        This is a code file. Edits are written verbatim and ship as-is. Keep the surrounding syntax intact.
                      </div>
                      <Field label="File contents">
                        <textarea
                          style={{ ...styles.input, ...styles.mono, minHeight: 520, resize: "vertical" }}
                          value={raw}
                          onChange={(e) => setRaw(e.target.value)}
                        />
                      </Field>
                    </>
                  )}
                </div>
              </div>

              {showPreview && previewUrl && (
                <>
                  <div
                    className="ac-split-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDoubleClick={() => setSplitPct(50)}
                    role="separator"
                    aria-orientation="vertical"
                    title="Drag to resize · double-click to reset"
                  />
                  <div style={{ ...styles.previewPane, flex: "1 1 0" }}>
                    {notLiveYet && (
                      <div
                        style={{
                          flex: "0 0 auto",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 14px",
                          borderBottom: "1px solid var(--ac-separator)",
                          background: "var(--ac-tinted-fill, rgba(0,122,255,0.15))",
                          font: "400 12.5px/1.4 var(--ac-font-text)",
                          color: "var(--ac-label)",
                        }}
                      >
                        <span style={{ flex: 1 }}>
                          This page is not in the published build yet, so the preview is showing the
                          site's fallback. It goes live a minute or two after you publish.
                        </span>
                        <button className="ac-btn ac-btn-gray" onClick={() => previewUrl && loadPreview(previewUrl)}>
                          Check again
                        </button>
                      </div>
                    )}
                    <div style={{ position: "relative", flex: 1, background: "#f5f5f7" }}>
                      {active === null && <div style={styles.previewLoading}>Loading preview...</div>}
                      <iframe
                        data-cms-preview="1"
                        src={frameA}
                        title="Live preview A"
                        onLoad={() => onFrameLoad("A")}
                        style={{ ...styles.iframeAbs, opacity: active === "A" ? 1 : 0, pointerEvents: active === "A" && !dragging ? "auto" : "none" }}
                      />
                      <iframe
                        data-cms-preview="1"
                        src={frameB}
                        title="Live preview B"
                        onLoad={() => onFrameLoad("B")}
                        style={{ ...styles.iframeAbs, opacity: active === "B" ? 1 : 0, pointerEvents: active === "B" && !dragging ? "auto" : "none" }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}


// sidebar.left glyph for the toolbar show/hide toggle
function SidebarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <line x1="9" y1="4.5" x2="9" y2="19.5" />
    </svg>
  );
}

// chevron.backward for the back button (item -> list -> site)
function ChevronLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

// questionmark.circle for the publish-timing help
function HelpIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.2a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.2-2.6 3.8" />
      <path d="M12 17.2v.01" />
    </svg>
  );
}

// folder glyph for the sidebar folders
function FolderGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h3.6a1.5 1.5 0 0 1 1.06.44l1.1 1.1a1.5 1.5 0 0 0 1.06.46H18.5A1.5 1.5 0 0 1 20 7.5v10A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-12z" />
    </svg>
  );
}

function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <label style={{ display: "block", marginBottom: 16, flex: grow ? 1 : undefined, minWidth: 0 }}>
      <div style={{ font: "590 13px/1.4 var(--ac-font-text)", letterSpacing: "-0.006em", color: "var(--ac-label-2)", marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ margin: "28px 0 14px", paddingBottom: 8, borderBottom: "1px solid var(--ac-separator)" }}>
      <div style={{ font: "600 20px/1.25 var(--ac-font-text)", letterSpacing: "0.019em", color: "var(--ac-label)" }}>{title}</div>
      {hint && <div style={{ font: "400 13px/1.45 var(--ac-font-text)", letterSpacing: "-0.006em", color: "var(--ac-label-2)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function HomeFields({ home, setHome }: { home: HomeBuf; setHome: React.Dispatch<React.SetStateAction<HomeBuf | null>> }) {
  const [advanced, setAdvanced] = useState(false);
  const patch = (fn: (h: HomeBuf) => HomeBuf) => setHome((h) => (h ? fn(h) : h));

  const setAbout = (key: keyof HomeBuf["about"], value: string, fmKey: string, list = false) =>
    patch((h) => ({
      ...h,
      about: { ...h.about, [key]: value },
      aboutFrontmatter: list
        ? setList(h.aboutFrontmatter, fmKey, value.split(",").map((s) => s.trim()).filter(Boolean))
        : setScalar(h.aboutFrontmatter, fmKey, value),
    }));

  return (
    <>
      <SectionHead title="Identity & hero" hint="The hero on the home page. Name is also used in the footer and nav." />
      <Field label="Hero title (the big home headline, exactly as shown)">
        <input style={styles.input} value={home.about.heroTitle} onChange={(e) => setAbout("heroTitle", e.target.value, "heroTitle")} placeholder="Hi, I'm …" />
      </Field>
      <Field label="Name (footer, nav)">
        <input style={styles.input} value={home.about.headerName} onChange={(e) => setAbout("headerName", e.target.value, "headerName")} />
      </Field>
      <div style={{ display: "flex", gap: 14 }}>
        <Field label="Role / eyebrow" grow>
          <input style={styles.input} value={home.about.role} onChange={(e) => setAbout("role", e.target.value, "role")} />
        </Field>
        <Field label="Email" grow>
          <input style={styles.input} value={home.about.email} onChange={(e) => setAbout("email", e.target.value, "email")} />
        </Field>
      </div>
      <Field label="Tagline (hero subtitle, first line)">
        <textarea style={{ ...styles.input, minHeight: 52, resize: "vertical" }} value={home.about.tagline} onChange={(e) => setAbout("tagline", e.target.value, "tagline")} />
      </Field>
      <Field label="Bio (hero subtitle, second line)">
        <textarea style={{ ...styles.input, minHeight: 64, resize: "vertical" }} value={home.aboutBody} onChange={(e) => patch((h) => ({ ...h, aboutBody: e.target.value }))} />
      </Field>
      <Field label="Locations (comma-separated)">
        <input style={styles.input} value={home.about.locations} onChange={(e) => setAbout("locations", e.target.value, "locations", true)} />
      </Field>
      <button className="cmsx-disc" style={styles.disclosure} onClick={() => setAdvanced((s) => !s)}>
        {advanced ? "▾" : "▸"} Advanced: raw identity frontmatter (eyebrow, hero video...)
      </button>
      {advanced && (
        <Field label="about.md frontmatter (YAML) · source of truth on save">
          <textarea style={{ ...styles.input, ...styles.mono, minHeight: 180, resize: "vertical" }} value={home.aboutFrontmatter} onChange={(e) => patch((h) => ({ ...h, aboutFrontmatter: e.target.value }))} />
        </Field>
      )}

      <SectionHead title="About me (proof)" hint="One paragraph per box. Use [text](/path) for links and [src](cite:key1,key2) for citations." />
      {home.proof.map((para, i) => (
        <Field key={i} label={`Paragraph ${i + 1}`}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <textarea
              style={{ ...styles.input, ...styles.mono, minHeight: 110, resize: "vertical" }}
              value={para}
              onChange={(e) => patch((h) => ({ ...h, proof: h.proof.map((p, j) => (j === i ? e.target.value : p)) }))}
            />
            <button className="cmsx-ghost" style={{ ...styles.ghostBtn, flex: "0 0 auto" }} title="Remove paragraph" onClick={() => patch((h) => ({ ...h, proof: h.proof.filter((_, j) => j !== i) }))}>
              ✕
            </button>
          </div>
        </Field>
      ))}
      <button className="cmsx-ghost" style={styles.ghostBtn} onClick={() => patch((h) => ({ ...h, proof: [...h.proof, ""] }))}>
        + Add paragraph
      </button>

      <SectionHead title="Recognition" hint="One row per line as: Text | /href (e.g. Time Extension | https://...)." />
      {home.recognition.map((grp, i) => (
        <div key={i} style={{ marginBottom: 18, padding: 14, border: `1px solid ${V.line}`, borderRadius: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <input
              style={{ ...styles.input, fontWeight: 600 }}
              value={grp.label}
              placeholder="Group label (e.g. Speaking)"
              onChange={(e) => patch((h) => ({ ...h, recognition: h.recognition.map((g, j) => (j === i ? { ...g, label: e.target.value } : g)) }))}
            />
            <button className="cmsx-ghost" style={{ ...styles.ghostBtn, flex: "0 0 auto" }} onClick={() => patch((h) => ({ ...h, recognition: h.recognition.filter((_, j) => j !== i) }))}>
              Remove
            </button>
          </div>
          <textarea
            style={{ ...styles.input, ...styles.mono, minHeight: 120, resize: "vertical" }}
            value={grp.items}
            onChange={(e) => patch((h) => ({ ...h, recognition: h.recognition.map((g, j) => (j === i ? { ...g, items: e.target.value } : g)) }))}
          />
        </div>
      ))}
      <button className="cmsx-ghost" style={styles.ghostBtn} onClick={() => patch((h) => ({ ...h, recognition: [...h.recognition, { label: "", items: "" }] }))}>
        + Add group
      </button>

      <SectionHead title="Product philosophy" hint="One principle per line." />
      <Field label="Principles">
        <textarea style={{ ...styles.input, minHeight: 150, resize: "vertical" }} value={home.philosophy} onChange={(e) => patch((h) => ({ ...h, philosophy: e.target.value }))} />
      </Field>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  full: { position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "var(--ac-bg)", color: "var(--ac-label)", zIndex: 9000 },
  // ---- sidebar: a native macOS / Apple Notes source list ----
  aside: { width: 288, flex: "0 0 288px", borderRight: `1px solid ${V.line}`, display: "flex", flexDirection: "column", background: "rgba(128,128,130,0.08)" },
  sideHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 12px 0 14px" },
  brand: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  avatar: { width: 20, height: 20, borderRadius: 6, objectFit: "cover", flex: "0 0 auto" },
  brandName: { font: "600 13px/1 system-ui", color: V.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  iconBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, padding: 0, border: 0, borderRadius: 7, background: "transparent", color: V.ink2, cursor: "pointer" },
  searchWrap: { position: "relative", margin: "10px 12px 6px" },
  searchIcon: { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: V.ink3, pointerEvents: "none", display: "flex" },
  search: { width: "100%", padding: "7px 10px 7px 29px", border: 0, borderRadius: 8, font: "400 13px/1.2 system-ui", color: V.ink, background: "rgba(128,128,130,0.14)", boxSizing: "border-box", outline: "none" },
  sectionLabel: { font: "600 11px/1 system-ui", letterSpacing: ".02em", color: V.ink3, padding: "8px 10px 4px" },
  folder: { display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", padding: "5px 8px", border: 0, borderRadius: 7, background: "transparent", cursor: "pointer" },
  tri: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 13, color: V.ink3, flex: "0 0 auto", transition: "transform .15s ease" },
  folderIcon: { display: "inline-flex", alignItems: "center", color: "#e0a83a", flex: "0 0 auto" },
  folderName: { flex: 1, minWidth: 0, font: "600 13px/1.3 system-ui", color: V.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  count: { font: "400 11px/1 system-ui", color: V.ink3, opacity: 0.65, flex: "0 0 auto" },
  row: { display: "block", width: "100%", textAlign: "left", padding: "6px 10px 6px 30px", border: 0, borderRadius: 7, background: "transparent", cursor: "pointer" },
  rowOn: { background: "color-mix(in srgb, var(--accent, #0066cc) 15%, transparent)" },
  rowTitle: { display: "block", font: "500 13px/1.35 system-ui", color: V.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowSub: { display: "block", font: "400 12px/1.3 system-ui", color: V.ink3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--ac-bg)" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 22px", borderBottom: `1px solid ${V.line}`, flex: "0 0 auto" },
  saveBtn: { padding: "8px 18px", border: 0, borderRadius: "var(--ac-radius-control)", background: "var(--ac-accent)", color: "#fff", font: "600 14px/1 var(--ac-font-text)", cursor: "pointer" },
  publishBar: { flex: "0 0 auto", padding: "10px 12px 12px", borderTop: `1px solid ${V.line}` },
  publishBtn: { width: "100%", padding: "9px 14px", border: 0, borderRadius: 8, background: V.accent, color: "#fff", font: "600 13px/1 system-ui", cursor: "pointer" },
  syncBtn: { width: "100%", padding: "7px 14px", marginTop: 6, border: 0, borderRadius: 8, background: "rgba(128,128,130,0.14)", color: V.ink, font: "600 12px/1 system-ui", cursor: "pointer" },
  ghostBtn: { padding: "6px 12px", border: "1px solid var(--ac-separator)", borderRadius: "var(--ac-radius-control)", background: "transparent", color: "var(--ac-label)", font: "500 13px/1 var(--ac-font-text)", cursor: "pointer" },
  splitRow: { flex: 1, display: "flex", minHeight: 0 },
  editorScroll: { flex: "1 1 0", minWidth: 320, overflowY: "auto", padding: "24px 24px 80px", background: "var(--ac-bg)" },
  previewPane: { flex: "1 1 0", minWidth: 320, display: "flex", flexDirection: "column", background: "var(--ac-bg)" },
  previewBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--ac-separator)", flex: "0 0 auto" },
  previewLink: { font: "500 12px/1 ui-monospace, monospace", color: "var(--ac-accent)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  iframeAbs: { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "#fff", transition: "opacity .18s ease" },
  previewLoading: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ac-label-2)", font: "400 13px/1 var(--ac-font-text)" },
  input: { width: "100%", padding: "8px 11px", border: "1px solid var(--ac-separator)", borderRadius: "var(--ac-radius-field)", font: "400 15px/1.45 var(--ac-font-text)", letterSpacing: "-0.015em", color: "var(--ac-label)", background: "var(--ac-bg)", boxSizing: "border-box" },
  mono: { font: "400 13px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace" },
  dim: { color: "var(--ac-label-2)", font: "400 15px/1.5 var(--ac-font-text)", padding: 16 },
  disclosure: { display: "block", margin: "4px 0 12px", padding: 0, border: 0, background: "transparent", color: "var(--ac-accent)", font: "500 13px/1 var(--ac-font-text)", cursor: "pointer" },
  warn: { padding: "10px 12px", marginBottom: 16, borderRadius: 8, background: "rgba(210,131,20,0.12)", color: "#8a5300", font: "500 13px/1.5 system-ui" },
};

const hoverCss = `
.cmsx-save:not(:disabled):hover { filter: brightness(1.04); }
.cmsx-disc:hover, .cmsx-link:hover { text-decoration: underline; }
.cmsx-ghost:hover { background: var(--ac-fill-4); }
`;
