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
pre-alpha but Metroid Prime Hunters is public alpha (not pre-alpha); gcnrecompiled was
renamed gcnlle and builds on DolRecomp (ModernGekko not referenced); ALttP widescreen
caps at 446px (~2:1), not 21:9; no 21:9 claim verified for Buu's Fury or Mario Kart
Super Circuit; Pokemon host-clock RTC sync not documented; Mega Man X "no slowdown" not
documented; NES Mesen HD texture pack support not documented; mstan/xboxlle does not
exist publicly (only xboxlle-probe).

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
  referenced via `cover:`/`gallery:`. Platforms without authentic media (Genesis,
  GameCube, Xbox) still use generated cover art. The ndsrecomp showcase images for
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
  paragraph, two SM64DS screenshots); excised per the standing rule. The
  n64decomp/sm64 reference in the founding article is unrelated prior art and
  stays.
- GitHub warns that psxrecomp.mp4 (61 MB) exceeds its 50 MB recommendation
  (hard limit is 100 MB; push succeeded). If more large videos land, consider
  compressing to ~720p crf 26 before committing.

## Card system + nav (2026-08-19)

- Platform cards use console photography from Wikimedia Commons in
  public/consoles/ (Evan-Amos). PlayStation, NES, SNES, GBA, DS, GameCube,
  CD-i, Xbox are public domain; sega-genesis.jpg and virtual-boy.jpg are
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
  names the Xbox first frame, GameCube boot menu, and CD-i BIOS.
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
  checks attributed to the runtime and hedged with "most projects", the green
  dot attributed to Xbox research rather than to a real console, and the
  Virtual Boy tech-demo status attributed to vbrecomp.
- No clip: cd-i (source is only Philips boot logos) and game-boy-advance
  (available window framed Link at the edge). Both keep static covers.

## Media sourcing (2026-08-19, fourth pass)

- YouTube downloads WORK again, in full, with:
  `yt-dlp -f "best[height<=720]" --extractor-args "youtube:player_client=web_embedded" --referer "https://1379.tech/" <url>`
  The old 10 MB truncation is gone. Several scratchpad `dec_*.mp4` files are
  those old partials and decode only part way (dec_aITjH0LoEeA stops at 32s,
  all intro); re-download rather than trusting them.
- ALWAYS cropdetect before cutting a clip:
  `ffmpeg -ss <t> -t 2 -i <src> -vf cropdetect=24:2:0 -f null -`
  Cutting by eye left black bars baked into gamecube, virtual-boy and
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
