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
