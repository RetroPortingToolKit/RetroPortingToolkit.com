# Working notes

## Homepage pass 2 (2026-08-18, owner-directed simplification)

Section order: hero (reel + pause control) > A different path from emulation
(ONE paragraph) > Preserve the game. Replace the constraints. (intro + three
image-backed capability stories + shared-platform prose note) > Featured
projects (4 covered cards from home.json `featured`, metadata from the game
items) > See it in action (4 MediaCards from home.json `action`) > catalog
links + ownership notice. Removed from home: Recompile. Run. Extend.; the
remaster/source-port comparison paragraph (parked here below, destined for a
future About/how-it-compares page); the transforms list; standalone SFA3/SMW
demo sections; the separate Videos list; the press-links block; the closing
manifesto block.

Retired paragraph (for a future About/glossary page):
"A remaster is a new production. A source port needs source code or a long
reverse-engineering effort for one title. An emulator reproduces the machine.
Recompilation sits in its own spot: keep the original game logic, and swap the
constraints around it."

Cover system: /public/covers/* (16:9, 1280x720). Sources: gbarecomp repo
screenshots (WarioWare, Minish Cap), team capture frames (SMW, SMB voxel,
Tomba, Prime Hunters, Mega Man X6 from permitted VGE footage), and the SFA3
video's published maxres thumbnail. validateHomeMedia() in
scripts/vite-prerender.mjs fails the build on missing/duplicate covers, missing
alts/credits, non-https video links, or a featured slug without a page.

## Homepage thesis rework (2026-08-18, owner-directed)

Home now sells "Preserve the game. Replace the constraints." (owner's outline):
hero "Bring classic games forward." with GitHub CTA, capabilities list, More than
emulation, Recompile/Understand/Augment, One improvement many games, console-feature
transforms, See it in action (videos), then Hardware/Games strips, In the wild,
Articles. New home.json keys: videos, capabilities, pillars, transforms, thesis
(CMS home saves now MERGE over the stored file so these survive editor saves).
Hero background (final form): a self-hosted 27s gameplay montage
(public/previews/hero-montage.{webm,mp4}) cut from the coverage footage. Video Game
Esoterica footage used with the channel's permission (relayed by the owner
2026-08-18); Gamemaster1379 footage is the team's own. Nine 3s clips, every cut
visually verified as gameplay (no FMV per owner). Under it, a crossfading collage of
verified gameplay stills (YouTube frame captures) serves as instant paint and the
reduced-motion / blocked-autoplay fallback. SFA3 could not be included in the montage
(only menu footage was retrievable from the first minute of the video; YouTube
throttled full downloads at ~10MB); its demo section embeds the full video instead.
Montage rebuild notes: source cuts and ffmpeg pipeline in the session scratchpad;
re-cut by downloading the videos and concatenating 3s segments at verified gameplay
timestamps, 1280x720/30fps, cropdetect to strip pillarboxing.

Demo blocks shipped 2026-08-18 with owner-supplied videos (verified via oEmbed):
- SFA3 "Five minutes from disc" demo: youtube aITjH0LoEeA (Video Game Esoterica,
  "Street Fighter Alpha 3 Recomp Out NOW! It's GOOD"); SFA3 also has a community
  game page (coverage-backed, still no public repo identified).
- SMW "Change the game." demo: youtube Owuku0zj4As (Gamemaster1379 SMW test).
Still prose-only, owner confirmed fine for now:
- PS1 link-cable over LAN and one-game-four-screens demos: in the transforms
  section as text until real demonstrations exist.
- Flywheel graphic ("more games -> more knowledge -> less work per game"): textual
  in the thesis section for now.
- Audience sections (for emulator devs / reverse engineers / modders / preservation)
  were condensed into "More than emulation." and the closing invitation.

## Content system (2026-08-18 restructure)

Sections: Hardware (`data/hardware/`), Software (`data/games/`), Articles (`data/blog/`).
One folder per item, `NN_slug/index.md`; NN is display order and clusters the `group`
frontmatter values, which the tab pages render as section headings in first-appearance
order. Frontmatter beyond the original schema: `status`, `provenance` (core|community),
`platform` (hardware slug, on software items), `arch` (hardware items), `repo`.
Old routes /work, /projects, /talks, /writing redirect. Card media falls back to
`/lab-media/<kind>/<slug>.webp` (none exist yet; cards render typographic until real
captures are added, `cover:` in frontmatter also works).

Every fact on the site was verified against the repos/articles/press on 2026-08-18.
Notes-vs-source corrections applied: snesrecomp is alpha (not late beta); ndsrecomp is
pre-alpha but Metroid Prime Hunters is public alpha (not pre-alpha); ALttP widescreen
caps at 446px (~2:1), not 21:9; no 21:9 claim verified for Buu's Fury or Mario Kart
Super Circuit; Pokemon host-clock RTC sync not documented; Mega Man X "no slowdown" not
documented; NES Mesen HD texture pack support not documented.

## Content follow-ups (missing sources)

- Twisted Metal 4 recomp repo URL (covered by retro-gamer.jp; page links coverage only).
- Pepsiman browser recomp repo URL (Notebookcheck coverage only).
- Sonic 2 Android community port: no URL.
- Cobalt's projects (Klonoa, TM4 relation, SFA3), ActRaiser, Metal Warriors (netplay +
  16:9 plans), Legend of Legaia: no public URLs found; not published.
- Tweets mentioned in team notes: no URLs supplied; none published.
- Time Extension article: exact publication day not shown on page (August 2026).
- PC Gamer and GamesRadar Spyro pieces exist but bylines/dates unverified; not cited.
  PC Gamer's "no AI" framing vs Time Extension's "AI-assisted" framing is worth a
  deliberate editorial decision before citing either.
- Withheld as non-public by request: Mario Kart DS, SM64DS, Pokemon Black (NDS),
  Rocket Knight Adventures (Genesis). Super Metroid repo is public but early; mentioned
  on the SNES page without its own page.
- 2026-08-19: screenshots harvested from the project repos (mstan/psxrecomp,
  snesrecomp, gbarecomp, per-game repos) now live in the item folders and are
  referenced via `cover:`/`gallery:`. Platforms without authentic media still use
  generated cover art. The ndsrecomp showcase images for
  non-public projects (MKDS, SM64DS) were deliberately NOT used.


## News model (2026-08-19)

- News is one blended chronological list (folder NN = date-desc rank), no groups.
  Filter chips All / News / Videos in the blog TabGrid; "Videos" = kicker "Video".
- Each video is its own internal page (kicker "Video", venue = channel,
  cover = ytimg thumb, videoUrl) with a click-to-play YouTube embed; videos are
  embedded, never re-hosted. Original upload titles are kept as a provenance line
  in the body; page titles are editorial.
- Bylines: press and video entries credit their venue, not the site author; the
  team sign-off end card renders only on 1379.tech articles.
- All in-body and frontmatter YouTube watch links on game/platform pages point to
  the internal video pages; external attribution lives on those pages.

## Known wart

- `scripts/optimize-media.mjs` is referenced by the CMS upload path
  (scripts/cms-dev.mjs doUpload) but does not exist in the repo, so CMS media
  uploads will fail at the processing step. Not touched this session.

## Content repopulation (2026-08-19, split-layout pass)

- All 45 game pages and 10 platform pages rewritten against re-fetched repo
  READMEs and release data, in the homepage voice, structured lead / Can I
  play it? / What the recomp adds / Technical details / Sources.
- `repo:` now renders as a "Get the project on GitHub" button on project
  pages; links entries duplicating the repo were removed.
- Corrections found during verification: 13 stale `availability: "Source
  only"` pills flipped to "Public build" (releases exist); Pepsiman's covered
  play URL returns HTTP 410 so its availability is now "No public release";
  Mario's Tennis upgraded to "Playable alpha" (README: full CPU match
  completes); Twisted Metal 4 repo found via press coverage and added
  (TechnicallyComputers/TwistedMetal4Recomp); MPH page notes v0.4.0-alpha in
  README is not a published release, and BIOS dumps are no longer required
  (FreeBIOS default).
- Removed as unverifiable: speedrunner-tester claim (Tomba), "crowd favorite"
  (Ape Escape), randomizer fork (X5), family split-screen (Sonic), Super
  Metroid public-repo claim (SNES page), and similar. Sonic 1 README says "no
  prebuilt binaries" but its Releases page ships them; pages follow releases.

## Full article port (2026-08-19)

- The 14 team articles are republished in full from 1379.tech (verbatim text,
  site punctuation rule applied), with all content images and Ghost-native
  videos downloaded into each item folder (~175 MB under data/blog/). Feature
  images became card covers. Press pages stay as attributed summaries by
  design (other outlets' copyright).
- Reprints had four references to non-public projects (RKA screenshot, Legaia
  paragraph, two SM64DS screenshots); excised per the standing rule.
- GitHub warns that psxrecomp.mp4 (61 MB) exceeds its 50 MB recommendation
  (hard limit is 100 MB; push succeeded). If more large videos land, consider
  compressing to ~720p crf 26 before committing.

## Card system + nav (2026-08-19)

- Platform cards use console photography from Wikimedia Commons in
  public/consoles/ (Evan-Amos). PlayStation, NES, SNES, GBA, DS and CD-i are
  public domain; sega-genesis.jpg and virtual-boy.jpg are
  CC BY-SA 3.0 and need visible credit if the design ever surfaces captions.
  Photos are `object-fit: contain` on a light plate, not cropped.
- Kicker chips render on news cards only; game and platform cards carry the
  platform in their section heading already.
- `.tvcard--game` / `.tvcard--hardware` had NO body or media styles at all
  (the variants were never written), which is why covers collapsed and text
  sat unpadded. Both now mirror the news-card treatment.
- Subpage nav bar must be `position: fixed`: `.home-next-page` sets
  overflow-x: hidden, which promotes it to a scroll container and silently
  breaks `position: sticky` on descendants.
- Remaining generated-art covers (no authentic capture exists): Tsumu Light,
  Mario Kart Super Circuit, Super Mario Advance 2 and 4, recomp-net,
  OpenPete/Spyro, Xenogears, Pepsiman; plus the Spyro and Pepsiman press
  pages. Super Mario Kart imagery is SNES and must NOT be used for the GBA
  Mario Kart page.

## Homepage rejig + cross-linking (2026-08-19)

- Homepage copy is rebuilt around the "Building & Enhancing Recomps" article:
  correctness-is-the-floor added to the proof, constraints intro carries the
  "games are the byproduct, the ecosystem is the product" thesis and the
  never-modify-the-ROM rule, stories are widescreen / shared mod loader /
  sensors (images copied from the article into public/covers/), platformNote
  names the CD-i BIOS.
- New home.json key `featuredPost` renders a "From the build log" banner
  (validated: cover asset + blog page must exist).
- Platform pages list their games ("Games on {platform}") in the media pane,
  linked; game pages link their platform via the kicker tag and end with a
  "More on {platform}" strip (up to 6 siblings). Linkage is the games'
  `platform:` frontmatter matching the hardware slug.
- Hardware groups merged: "Research" folded into "Early platform work", with
  a muted explainer under the heading on the Platforms tab.

## Platform-page polish (2026-08-19, second pass)

- Carousel YouTube slides are poster-first click-to-play (CarouselYouTube in
  ProjectCarousel): auto-embedding an iframe rendered a blank card when
  YouTube declined to play. Poster = slide.poster (the item cover), else the
  yt thumb.
- Console stage on platform pages capped at min(44vh, 400px) so the games
  grid shows without scrolling; game tiles at 210px min with generated
  catalog art (svgCover, now exported from labContent) when no cover exists.
- Project pages: one kicker chip styled identically to card chips
  (chipColorFor), linking to the platform on game pages; the feature-tag
  chips (WIDESCREEN, DEBUG MENU...) are gone; "More on {platform}" heading
  links to the platform page.
- Modal chrome gains a Back button when react-router history has an in-app
  entry behind it (location.key !== "default").
- Game/platform cards clamp desc at 3 lines (was 2).

## Card motion + homepage rewrite (2026-08-19, third pass)

- Cards animate wherever a clip exists: `public/previews/<slug>.mp4` (+ a
  `.webp` of its FIRST frame as the poster) drives `CardMotion` on home cards
  and `projectMedia` on the game/platform grids. News cards stay static by
  design. Play badges are gone from animated cards.
- `src/generated/previews.ts` is generated by `node scripts/gen-previews.mjs`
  from whatever is in public/previews. Run it after adding or removing a clip.
- Clip spec: 640x360, ~5s, 24fps, H.264 High, yuv420p, `-bf 0`, `-an`,
  `+faststart`, crf 27, under 900 KB. Posters via `cwebp` (this machine's
  ffmpeg has NO webp encoder, so `ffmpeg -o x.webp` fails).
- Cards use a plain muted inline <video>, not the WebCodecs canvas path: the
  canvas path stays reserved for the hero reel. Motion is gated on a
  near-viewport check that falls back to "play" when the viewport cannot be
  measured (a hidden/0-height document never fires IntersectionObserver, which
  would otherwise freeze every card on its poster).
- Verifying motion in the in-app browser pane is unreliable: it reports
  `visibility: hidden` and `innerHeight: 0`, which pauses media and freezes
  requestAnimationFrame. Check DOM state, not screenshots.
- Homepage copy was rewritten end to end (3 drafts, 3 judges, synthesis, then
  a fact-check pass that caught 9 unsupported or overstated claims). Section
  headings now live in data/home.json `sectionTitles` and are mirrored by the
  prerenderer. Facts corrected against the repo: no universal "game file is
  never modified" (Super Mario World's co-op build patches your ROM on first
  launch), "byte for byte" scoped to widescreen output only, fingerprint
  checks attributed to the runtime and hedged with "most projects", and the
  Virtual Boy tech-demo status attributed to vbrecomp.
- cd-i does now have a clip, cut from the shell/menu at 0 to 5s rather than
  the Philips logos deeper in the same source.
- Checking a clip for black bars: cropdetect gives FALSE POSITIVES on games
  whose own background is black. Measure max luminance per edge strip across
  the frames instead; a real letterbox bar stays pinned near 16.

## Media sourcing (2026-08-19, fourth pass)

- YouTube downloads WORK again, in full, with:
  `yt-dlp -f "best[height<=720]" --extractor-args "youtube:player_client=web_embedded" --referer "https://1379.tech/" <url>`
  The old 10 MB truncation is gone. Several scratchpad `dec_*.mp4` files are
  those old partials and decode only part way (dec_aITjH0LoEeA stops at 32s,
  all intro); re-download rather than trusting them.
- ALWAYS cropdetect before cutting a clip:
  `ffmpeg -ss <t> -t 2 -i <src> -vf cropdetect=24:2:0 -f null -`
  Cutting by eye left black bars baked into virtual-boy and
  super-mario-bros, which read as broken card art. Verify the finished clip
  the same way; it should report crop=640:360:0:0.
- Sources that are NOT montages, despite their names: nesrecomp.mp4 is one
  continuous Zelda session, snesrecomp.mp4 is Super Mario World only,
  genesisrecomp.mp4 is Sonic 2 only, psxrecomp.mp4 is Tomba! only.
- Still no footage anywhere for: Metroid, Mega Man 3, Dr. Mario, Faxanadu,
  Duck Hunt, Yoshi, Yoshi's Cookie, Gumshoe, A Link to the Past, DKC2,
  Sonic 3 & Knuckles, Tomba! 2, Ape Escape, Mega Man X5. Stills only.
- Still no cover art anywhere for: super-mario-advance-2, super-mario-advance-4,
  recomp-net, xenogears. Repos, releases, READMEs, articles and coverage were
  all searched; these keep generated art.
- Cover provenance worth knowing: openpete-spyro's cover is an ixbt.games frame
  (credited by them to a third-party channel) and pepsiman's is from Retro
  Handhelds; both outlets are linked on their pages. tsumu-light uses the
  project's own launcher box art (250px, upscaled), matching the precedent set
  by sonic-3-and-knuckles and twisted-metal-4.

## Game pages are articles (2026-08-19, fifth pass)

- Game pages render in the article reader, not the two-pane split. Media is
  placed INLINE through the body: `![caption](./shot.png)` for stills,
  `![caption](/previews/<slug>.mp4)` for the looping clip, and
  `![caption](https://www.youtube.com/watch?v=ID)` for coverage, which
  Markdown.tsx renders as a click-to-play embed. The `gallery:` frontmatter is
  gone from every game page; leaving it would render the same images twice.
- The article masthead carries the game's platform chip (links to the platform
  page), its status pill, and the GitHub button. Games do NOT get an author
  byline; that stays blog-only.
- Platform pages: the right pane is the games grid alone. No console art, no
  carousel.
- Cards decode their clip into a <canvas> via WebCodecs again
  (`canvasVideo.ts`). That is the Safari fix: Safari will not autoplay a grid
  of <video> elements. Do NOT "simplify" this to a <video> element again; it
  looks broken on Safari. The <video> path is only the fallback where
  WebCodecs is missing.
- Generated cover art now sets the game's TITLE rather than its initials, so a
  game with no screenshot in existence still gets a designed cover.
- scripts/optimize-media.mjs now exists, so CMS media uploads work: jpg/png to
  webp (cwebp, chosen adaptively between lossless and lossy), mov/m4v to mp4
  plus a webm sibling, mp4 normalized and given a webm, and one LQIP entry
  merged per upload. Single-file mode only, never a tree walk.

## Verifying in the in-app browser pane

The pane frequently reports `visibility: hidden` AND `innerWidth/innerHeight
= 0`. In that state NO item detail renders at all (the layout hooks see a
zero viewport), media is paused, and requestAnimationFrame never fires, so
canvas playback cannot paint. Call resize_window with a real size first, e.g.
1440x900, before concluding anything is broken.

## Media that does not exist anywhere

Searched exhaustively (repos, releases, READMEs, article images, the team
channel's 340 videos, 1379.tech's sitemap): no footage or screenshots exist
for Super Mario Advance 2, Super Mario Advance 4, Xenogears, or recomp-net.
Blog image FILENAMES are unreliable: SuperMarioBrosRecomp_FJUAp00Pl2.png is a
Faxanadu shot, FaxanaduRecomp_6sPcjmDyMv-2.png is Duck Hunt, and
FaxanaduRecomp_6sPcjmDyMv-1.png is Sonic 2. Open an image before captioning it.


## Home card animation, root cause (2026-08-19)

Home cards were mounting NO canvas at all: CardMotion gated decoding on an
IntersectionObserver, and when the first callback says "not intersecting"
(cards below the fold) and no later callback arrives, `near` stays false
forever and the card sits on its poster. SpatialCard survives this because a
45-card grid always has cards intersecting at first paint.

Fix: CardMotion no longer gates on an observer at all. Eleven home cards can
decode immediately. It now mirrors SpatialCard exactly: canvas over poster,
NO opacity state (a canvas is transparent until its first frame paints, so
the poster shows through on its own, and there is no flag that can strand a
card on the still).

Rule of thumb: any visibility gate is a way for a card to freeze. Only gate
where the card count actually justifies it.


## Home cards ARE catalog cards (2026-08-19)

The home page no longer has bespoke card components. Stories, "Playable
today" and "Watch it run" all render `SpatialCard`, the same component the
Games and Platforms grids use, built by the `homeCard()` helper in
src/pages/Home.tsx. Only the blurb (and, for stories and the coverage row,
the headline) is overridden; the media, tilt, chip logic and canvas-decoded
playback are shared.

This is why: three separate card implementations meant three chances to get
Safari playback wrong, and the home one was the one that was wrong. There is
now a single path. `CardMotion` and its CSS are deleted; do not reintroduce a
second card component for the home page.


## Platform cards (2026-08-20)

- Platform cards carry two meta chips: the number of game pages naming that
  platform (computed in labContent from `platform:` frontmatter, never typed
  by hand) and a maturity label read from a new `maturity:` field on each
  data/hardware page ("Beta" for the five with playable catalogues,
  "Alpha" for the research bring-ups). Change the label in the frontmatter,
  not in a component.
- The Platforms tab is one blended list sorted by game count, so the group
  headings ("Active platform ecosystems" / "Early platform work") no longer
  render. Only the Games tab still groups.
- Watch the module init order in src/lab/labContent.ts: `labHardware` is
  evaluated at import time, so anything it calls must be defined ABOVE it.
  A `const` lookup table declared below it throws "Cannot access before
  initialization" and blanks the whole site.

## Game dates (2026-08-20)

`added:` and `updated:` on each game page come from the project's own GitHub
repository: `created_at` (first commit) and `pushed_at` (last push), fetched
with `gh api repos/OWNER/REPO`. They drive the Games tab's sort control.
Refresh them by re-running that fetch; do not hand-edit.

Three games have no public repository (openpete-spyro, pepsiman,
street-fighter-alpha-3) and therefore no dates. They sort last rather than
being given invented ones.

Note `verified:` is a different thing: it is the date the page's FACTS were
last checked, and every page currently shares one value, so it is useless as
a sort key.

## Catalogue expansion (2026-08-20)

45 games and 10 platforms became 70 and 13. Everything new was written from
the project's own README and releases.

New platforms included Master System and Game Gear (mstan/smsggrecomp).

Find missing projects with:
  gh search repos "R.A.I.D. community" --limit 100 --json fullName
The community publishes weekly, so "no public repository" lines on pages go
stale fast. Street Fighter Alpha 3 had said that for weeks while a repo with
14 releases existed.

Traps hit while doing this:
- A repo being visible to `gh` does NOT mean it is public: our login has access
  to private repos. TechnicallyComputers/Wipeout-3-Special-Edition-Recomp is
  private (404 unauthenticated), so its page links the public mstan copy
  instead. ALWAYS verify with an unauthenticated
  `curl https://api.github.com/repos/OWNER/NAME` before linking.
- Some repos are untouched forks with no releases; link the upstream where the
  actual work and downloads live (Syphon Filter 2 -> Alexbeav).
- Box art in a repo is not always that game (Marvel vs Capcom's is Marvel Super
  Heroes vs Street Fighter); open the image before using it.
- Some READMEs are copy-pasted from another title (Toy Story 2's names Tomba
  and Tomba's serial); ignore claims that trace back to the wrong game.
- `year:` is the PROJECT's year ("2026") on every page, not the original
  game's release year. It feeds the article date line.

## Cover provenance, settled 2026-08-21

The owner obtained permission to use both covers that were previously flagged
as open questions. They are settled, not pending; do not re-raise them.

- `data/games/39_openpete-spyro/index.md` -> `./openpete-spyro.jpg`, a frame
  from the ixbt.games article linked in that page's `links:`.
- `data/games/42_pepsiman/index.md` -> `./pepsiman-browser.jpg`, from the
  Retro Handhelds article linked in that page's `links:`.

There is no `coverCredit` field on items and the site renders no image credit;
both pages already link their source article under `links:`.

## Performance and accessibility follow-up (2026-08-29)

- `npm run images` generates same-stem WebP siblings plus 640px and 1280px
  variants for still images larger than 500 KiB. The content loader prefers the
  WebP and emits `srcset` for cards, game tiles, article covers, and carousels;
  originals remain beside them for provenance and rollback. The Vite asset glob
  still emits originals into `dist/`, but browsers no longer request them for
  these surfaces.
- Desktop item and collection overlays, plus their mobile Vaul sheets, now keep
  Tab focus inside the active dialog. Nested dialogs opt out so a video
  lightbox owns its own focus cycle.
- `buildRouteMeta` cover helpers have direct traversal, public-path, external-
  URL, and co-located-cover tests. The WebMCP origin-trial plugin rejects an
  expired token during a build; the current token expires 2026-11-17 UTC.
- Verification after this pass: typecheck green, production build green, 719
  tests green. React Router is on the v7 line; `npm audit --omit=dev` reports
  zero production vulnerabilities.
- The build keeps bootstrap JavaScript under 900 kB by splitting catalog,
  blog, and each documentation section. The deferred documentation search
  index remains one intentionally lazy ~809 kB chunk.

## Editorial documentation pass (2026-08-29)

- Reworked the public platform index to focus on maintained, clearly scoped toolchains; removed maturity-ranking language and stopped advertising unowned or experimental platform paths.
- Rewrote `recompiler-and-runtime` as a reader-facing concept page without source dumps, repository internals or implementation-specific commands.
- Simplified `recomp-your-own-game` into a user workflow that points dependency checks and exact commands to the starter repository/agent, and clarified that a successful build is only the start of porting.
- Added the hardware-decoupling and modifiability benefit to `what-is-static-recompilation` and removed its jarring source appendix.
- Simplified `code-discovery` to the core reader-facing model (evidence, guesses and runtime fallback), removing source dumps and console-specific implementation detail.
- Rewrote `the-game-file-you-supply` as concise legal/technical guidance: users bring authorized files, keep them private, and match the exact revision; repository citations and quoted legal text are gone.
- Public rendering now suppresses the contents of every `## Source` appendix while retaining the heading for stable navigation; added a brief Redump-format explanation to the game-file guidance.
- Added a site-wide documentation preview banner: docs remain available for the v1 launch, but clearly signal that they are early and that linked repositories are the source of truth for exact commands/support.

## Release audit (2026-08-30)

- Article videos no longer receive a source until they approach the viewport;
  user-started playback keeps its source while ambient autoplay still follows
  the site's motion/data policy. The Tomba route was checked in the local
  production build: no source before intersection, then the expected source
  after scrolling into the 400px load margin.
- Home swipe animation stores frame-by-frame progress outside React state, so
  a drag no longer rerenders the whole Home tree or rebuilds its observers on
  every animation frame.
- CMS mutations use one pinned Git snapshot from validation through commit.
  Ref movement now produces an HTTP 409 instead of applying a stale write;
  Home saves use the same compare-and-swap rule.
- Public documentation source appendices are omitted from rendered pages,
  catalog routes do not import documentation bodies, and the build confirms
  eight documentation body chunks with none statically reached.
- `npm run assets:audit` is the repeatable asset gate. It reports 374 media
  files (238,337,262 bytes), 22 preserved provenance originals excluded from
  the client build (24,724,514 bytes), 11 shadowed social-cover copies
  suppressed, and no stale LQIP files. Nine stable public aliases remain
  intentionally reachable for URL compatibility. The exact before/after
  production-build comparison fell from 724 to 684 files and from 258,959,135
  to 232,204,638 bytes: 26,754,497 bytes (25.52 MiB, 10.33%) removed.
- Direct item and collection routes now move initial focus inside the active
  desktop dialog or mobile sheet after opening. The standard mobile item sheet
  also uses the same Tab boundary as the other overlays. Local browser checks
  covered 1280px and 390px viewports; the mobile routes had no horizontal
  overflow.
- Final production output at this checkpoint: 893 modules, 192 prerendered
  routes, 67 item social covers, bootstrap JavaScript 567.12 kB raw / 180.22
  kB gzip, catalog 279.03 / 79.65 kB, blog 235.09 / 82.93 kB, and the lazy docs
  search chunk 760.66 / 271.51 kB. The build still warns that six documentation
  pages declare 2026-08-26 while their latest content commit is 2026-08-29;
  this is date metadata, not a build failure.
- Browser automation verifies engine-visible behavior only. Any Safari-native
  cursor or physical trackpad claim still requires the deployed build to be
  exercised in real Safari on macOS under the project contract.

## Blog and overlay hardening (2026-08-31)

- Covered item and collection overlays are inert and hidden from assistive
  technology. Their videos, embeds, demos and carousels release or withhold
  media sources until the layer becomes active again.
- All item, collection and portal lightbox dialogs share one focus owner. The
  topmost dialog wraps Tab, focuses the correct scroll container on entry and
  restores its opener on exit; lightboxes also isolate the app beneath them.
- Blog feeds now validate required identity/date fields, reject invalid dates
  and duplicate canonical URLs, exclude drafts, and sort equal dates by slug.
  Feed tests cover escaping and require exact parity with published blog
  routes. The escaping test found and fixed double-escaped query parameters.
- Verification: typecheck green, production build green (894 modules, 192
  prerendered routes, 36 feed posts), and all 780 tests green. The six existing
  documentation-date warnings remain unchanged.

## Game Master PR integration (2026-08-31)

- PR #2's 16-commit documentation rewrite and PR #4's stacked site/content
  rewrite are merged, along with PR #3's deliberately unlinked, noindex About
  team draft. The About page remains a draft surface at `/about`; it is not in
  navigation or the sitemap.
- The non-doc pass removes the misleading/legacy platform and game listings,
  removes the Minish Cap showcase preview, adds Mega Man X2, Mega Man X3 and
  ActRaiser, and lets individual games opt out of platform-page showcases with
  `showOnPlatform: false`.
- The existing split catalog/docs loader remains intact. The new
  `showOnPlatform` field is parsed in `contentCore`, so the PR behavior reaches
  both static content and CMS previews without restoring the old monolithic
  loader.
- Thirty-nine media files and diagrams made unreachable by the rewritten
  ecosystem article/docs were removed after the asset audit identified them;
  they remain recoverable from git history.
- Verification: typecheck green, production build green (837 modules, 184
  prerendered routes, 36 feed posts), asset audit green, and all 761 tests
  green. Four existing fleet documentation-date warnings remain.

## Discord publishing agent (2026-08-31)

- The owner explicitly requested and approved a persistent Discord bot that
  turns allowlisted mentions into serialized Codex tasks for this repository,
  including normal tested commits, pushes and production verification.
- `scripts/discord-agent.mjs` is the Gateway bridge. Its pure authorization,
  mention parsing, prompt boundary and response chunking live in
  `scripts/discord-agent-core.mjs` with tests. The bot token is never passed to
  Codex and is designed to live only in the login Keychain.
- `scripts/install-discord-agent.sh` installs the owner-approved launchd job
  only after both a Keychain token and a fail-closed local allowlist exist.
  Full setup and operational boundaries are in `docs/DISCORD_AGENT.md`.
- Discord application provisioning is complete. The bot is installed in the
  intended server and channel with a local allowlist, its token is stored in
  the login Keychain, and the launchd bridge is running.

## Discord live publishing test (2026-08-31)

- The AI agents section now tells readers to expect a final recap naming the
  files changed, checks run, commit, and published URL.
- This change is the live end-to-end test of the Discord publishing agent from
  an allowlisted request through production verification.
- Verification: typecheck green, production build green with 184 prerendered
  routes, and all 767 tests green. Four existing documentation-date warnings
  remain unchanged.

## Blog authorship (2026-08-31)

- Every blog item now carries an explicit author. Posts syndicated or adapted
  from Matthew Stanley's 1379.tech articles credit Matthew Stanley. All other
  blog items credit Shokunin.
- `SITE.author` is Shokunin, so feeds and any future post missing explicit
  frontmatter use the same first-party default.

## Discord replies and cancellation (2026-08-31)

- Authorized replies to a bot message now address the bot without another
  mention. The referenced bot message and its original request are passed as
  context when Discord can resolve them.
- `stop`, `cancel`, and `abort`, either by mention or reply, terminate the
  active Codex process group. The bot acknowledges the command immediately and
  reports the stopped state on the original request. Queued work remains queued.
- The installer retries `launchctl bootstrap` because macOS can briefly return
  an input/output error immediately after removing the previous job.

## Remotion showcase video (2026-08-31)

- `video/src/` contains a reproducible 15-second, 1920x1080 Remotion showcase
  of the live home and games pages plus the homepage's curated modified-game
  hero montage.
- `npm run video:studio` opens the composition and `npm run video:render`
  writes `video/out/retro-porting-toolkit-showcase.mp4`.
- Live-page captures used by the composition are checked into `video/public/`.
  Rendered output stays local under the ignored `video/out/` directory.

## Public PR previews (2026-08-31)

- Vercel automatically builds every pull request as a live preview deployment.
- Vercel Authentication is disabled for this project so reviewers can open the
  generated preview URL and see the website without a Vercel account or login.
- Preview responses retain Vercel's automatic `X-Robots-Tag: noindex` header;
  production remains served from the normal custom domain.

## Safari homepage media regression (2026-08-31)

- Real Safari verification found both production and PR #5 frozen on homepage
  media. The August 30 ambient-media preference gate had disabled the hero and
  every `SpatialCard`, undoing the established WebCodecs Safari fallback.
- Homepage media again mounts independently of ambient-media preferences. The
  hero keeps its explicit pause control, reduced motion still stops the loading
  collage rotation, and noninteractive pager panes still use `still` posters.

## Site icon (2026-08-31)

- The owner-provided game-controller character is the site mark. Web-ready
  variants retain the artwork's rounded-square silhouette with transparent
  outer corners.
- The navigation uses the 72px variant at 36px, while browsers receive 16px and
  32px favicons plus a 180px Apple touch icon. The 512px processed source is
  retained in `public/site-icon.png` for future platform sizes.

## Original-game recompilation baseline (2026-09-01)

- The Concepts page at `/docs/concepts/start-with-the-original-game` tells port
  developers to recompile a clean original release, not a patched ROM or disc
  image.
- Bug fixes, quality-of-life changes, translations and other ROM hacks belong
  in the mod layer. Their patches can guide implementation, but do not become
  recompiler inputs. A true full custom game is the narrow exception and is an
  explicit target of its own.

## Launch preparation and homepage restoration (2026-09-01)

- The primary navigation label is `Blog`; the route remains `/blog` for URL
  stability. Unknown routes now receive a real HTTP 404 from the prerendered
  deployment rather than returning the SPA shell with a 200.
- The repository README has a compact launch FAQ covering what static
  recompilation is, game-file boundaries and contribution expectations.
- Discord requests that delete, rename or otherwise destructively alter
  published content are restricted to Shokunin, Gamemaster and CobaltCryptid.
  General publishing requests still pass through the existing content-policy
  and verification prompt boundaries.
- Homepage commit `11b45ce` replaces the generic post-PR copy with concrete,
  source-backed examples: adaptive widescreen, Boktai's weather-driven sensor,
  runtime text replacement, reusable tooling, Mega Man X6's authorized tweak
  set, character swaps in Super Mario Bros. and the short Street Fighter Alpha
  3 setup path. It deliberately does not restore the old unverified multiplayer
  claims or treat fidelity as every project's universal goal.
- The homepage's wide `From the build log` card is restored and points to the
  internal `building-enhancing-recomps` article. Its public cover is
  `public/covers/build-log-ecosystem.jpg`.
- Verification at this checkpoint: JSON parse, typecheck, production build and
  all 751 tests green. Production was checked for the restored build-log copy
  after deployment.
- Social-sharing metadata now has a real 1200x674 default image at
  `public/og/default.jpg`, captured from the current production hero. Home,
  Platforms, Games, Blog, Docs, topic routes and items without their own cover
  use it for Open Graph and Twitter large cards; item-specific covers still
  take precedence. The base `index.html`, prerender metadata regression test
  and asset auditor all know the same default-image convention. Verification:
  typecheck, production build and all 752 tests green.
- The initial production crawl covered all 165 sitemap pages and 295 discovered
  first-party routes/assets. It found one 404: the Bomberman World and Bomberman
  Fantasy Race pages still linked to the removed `/blog/recomp-net` article.
  A first repair pointed them at `/docs/reference/recomp-net-api`, but the
  post-deployment crawl correctly caught that route as another 404. Git history
  showed both recomp-net pages and the site's multiplayer claims were
  deliberately removed together in `045fa35`; Game Master's later rewrite had
  reintroduced the two Bomberman claims and their tags. The claims and tags are
  removed again. Typecheck, production build and all 752 tests are green.
  After correction commit `aed525b` deployed, a second production crawl checked
  all 165 sitemap pages and 295 discovered first-party routes/assets with zero
  page or link errors.

## Launch-path visual QA (2026-09-01)

- Production was screenshotted headlessly (cached Playwright Chromium) at
  1440x900 and 390x844 across the launch path: home, /hardware, /games, /blog,
  /games/tomba, /hardware/playstation, the build-log article and /docs. All
  routes 200, no console errors, no broken images, no horizontal overflow.
  Note the catalog routes are /hardware, not /platforms.
- QA of lazy media needs a scroll-through first: a fullPage screenshot without
  scrolling shows empty card plates (below-fold covers wait for the viewport),
  and a fixed item dialog photographs blank in fullPage mode. Neither is a site
  bug; capture the viewport after scrolling instead.
- One real bug found and fixed: on phones the active Blog tab hid behind the
  opaque sticky search/theme box. The tab row's scroll-into-view check in
  `src/components/Tabs.tsx` compared against the row's right edge, but
  `.tabs-actions` covers the row's last ~110px, so a tab could count as
  visible while fully covered. The check now ends the usable strip where the
  actions box begins; /blog and /docs both center their active entry on a
  390px viewport. Verified against the local production build.
- Verification: typecheck green, production build green (174 prerendered
  routes), all 752 tests green.

Remaining launch-readiness work at this checkpoint:

- Draft the Hacker News and Product Hunt launch copy only after the audited
  product claims and canonical URLs are stable. Analytics and a contact page
  are explicitly deferred by the owner; the hero reel is the demo and the
  existing site imagery supplies screenshots.

## Discord bot: public answers, runner fallback, quiet checkout (2026-09-02)

Three changes to `scripts/discord-agent.mjs` and its core module. Operational
detail stays in `docs/DISCORD_AGENT.md`.

- **The channel decides capability.** Channels listed in
  `DISCORD_PUBLIC_CHANNEL_IDS` let anyone who can post there ask questions
  about the site and nothing else; the publishing channel is unchanged, and
  every other channel is silent rather than posting its own refusal. The
  answer lane runs read-only at the sandbox level, not by wording, and its
  prompt allowlists non-draft `data/` pages, `public/` media and the public
  docs — the rest of the checkout holds withheld projects and internal notes.
  Questions are wrapped as untrusted text with the delimiter restated after
  the message, and hyphen runs are collapsed so a message cannot forge its own
  closing fence. The control that actually holds is on the way out: every
  answer is scanned before posting and withheld if it carries a credential
  shape, an internal path or a reference to operational files. Answers are
  formatted for a chat window (answer first, under 700 characters, at most two
  bracketed links with embeds suppressed). The answer lane has its own queue,
  so a question cannot delay a publish.
- **Runner fallback, Codex then Claude.** Codex ran out of credits, so both
  lanes now hand over to Claude Code when a runner cannot serve at all (no
  credits, missing or expired credentials, not installed); a request that
  genuinely failed is reported failed rather than retried on the second
  runner. The chain prefers the subscription the owner already pays for, with
  `ANTHROPIC_API_KEY` stripped from that tier's environment so the CLI cannot
  quietly bill credits; a prepaid key is a third tier only when configured,
  and needs `--bare` because the CLI otherwise ignores the key in favour of
  its stored login. An unusable key counts as an unavailable runner, not a
  task failure, so it cannot suppress the maintainer alert. Each lane keeps
  its boundary on either runner, and a test asserts the answer lane can never
  be handed a writable one. Exhausting every runner posts an hourly
  rate-limited warning into the publishing channel, because subscription auth
  expires and an unattended process cannot renew it.
- **A busy checkout is a wait, not a failure.** A clean tree is a poor proxy
  for nobody working, since someone committing every few minutes has a clean
  tree most of the time. The agent now starts only when there are no
  uncommitted files and no commit in the last 90 seconds, with the same
  reading holding across a five-second settle window. A parked request holds
  its place for up to six hours and starts itself the moment the tree goes
  quiet, with a progress note every fifteen minutes; the cap only exists so a
  tree left dirty overnight eventually reports something. Success at the end
  of a run is now whether HEAD moved, not whether the tree is pristine —
  requiring an empty `git status --porcelain` is what discarded the 02:15
  request that had already succeeded. That holds because the agent stages its
  paths by name. The one case that still stops is the one that cannot be
  separated: the agent and a person changed the same file.

## Mascot room images (2026-09-03)

Each platform page carries `mascot-room.webp`, a square 3D toy-style room scene.
The convention, which the Game Boy Advance image broke: the mascot is shown
**from behind**, back of head plain, no face and no buttons visible. Face-on,
the character has a black cross D-pad on the LEFT, two ROUND red buttons on the
RIGHT, a black open smile and pink blush marks.

Outstanding: the GBA image still needs regenerating. Its character is rotated
so a mirrored face shows, its buttons read as square, and the handheld it holds
looks like a Switch Lite rather than a clamshell Game Boy Advance SP. There is
no image generation tooling in this repo or available to a session, so this one
needs whoever generates the art.
