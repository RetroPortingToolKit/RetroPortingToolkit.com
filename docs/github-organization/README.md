# GitHub organization profile

Ready-to-copy profile for `RetroPortingToolKit/.github`. Only the `profile/`
folder belongs in that repository. Its public `profile/README.md` becomes the
organization Overview introduction. Images are bundled, with relative paths,
so the profile does not depend on the website's generated asset URLs.

## Publication status

Prepared on 2026-09-09. **Not yet published to the organization.** The public
`.github` repository was not accessible (GitHub 404; git reported repository
not found). This session is credentialed only for the website repository, and
the available tools do not include the access-request tool described in the
repository contract. The owner must create the repository and do its first
push. No organization settings or pins have been changed.

## Publish once

Create a **public, empty** repository named exactly `.github` under
`RetroPortingToolKit` on [GitHub](https://github.com/new). Do not initialize it
with a README, license, or gitignore. Then run this block in your own terminal.
It uses a fresh destination; each step stops if the previous step fails.

```sh
git clone https://github.com/RetroPortingToolKit/.github.git /Users/shokunin/dev/retroportingtoolkit-org-profile &&
cp -R /Users/shokunin/dev/retroportingtoolkit.com/docs/github-organization/profile /Users/shokunin/dev/retroportingtoolkit-org-profile/profile &&
git -C /Users/shokunin/dev/retroportingtoolkit-org-profile config user.name Shokunin &&
git -C /Users/shokunin/dev/retroportingtoolkit-org-profile config user.email 30949000+tetrisgm@users.noreply.github.com &&
git -C /Users/shokunin/dev/retroportingtoolkit-org-profile add profile &&
git -C /Users/shokunin/dev/retroportingtoolkit-org-profile commit -m "Add Retro Porting Toolkit organization profile" &&
git -C /Users/shokunin/dev/retroportingtoolkit-org-profile branch -M main &&
git -C /Users/shokunin/dev/retroportingtoolkit-org-profile push -u origin main
```

Open [the public organization page](https://github.com/RetroPortingToolKit)
signed out or in a private window. Confirm the introduction, all four images,
and the website/docs/Discord links are visible. After publication, edit the
`.github` repository as the source of truth; this folder is the initial handoff.

## Suggested pins

Use **Pin repositories** on the organization Overview to select these six
public repositories, in this order:

1. `RetroPortingToolkit.com`: the front door, documentation, and project catalog.
2. `Retro-Launcher`: the player-facing starting point.
3. `Retro-Studio`: developer tooling for title projects.
4. `recomp-ui`: shared launcher and settings UI.
5. `recomp-net`: shared netplay library.
6. `Retro-Catalog`: title discovery data.

Individual game highlights in the README link to contributors' repositories;
they are not presented as repositories hosted by this organization. Hide the
suggested onboarding tasks once the profile and pins are in place.

## Sources and assets

Copy is based on `data/home.json`, `src/lib/site.ts`, the three game pages,
and the linked public tool READMEs inspected on 2026-09-09. It avoids claiming
universal compatibility, automatic ports, or mandatory faithful behavior.
The netplay library uses delay synchronization, not rollback.

Images are existing project assets, not generated gameplay:

| Profile image | Source in the website checkout |
| --- | --- |
| `images/repokun.png` | `assets/repokun/renders/repokun-transparent.png` |
| `images/minish-cap.png` | `data/games/12_minish-cap/minish-cap-adaptive.webp` |
| `images/mega-man-x6.png` | `data/games/06_mega-man-x6/mmx6-widescreen-gameplay.png` |
| `images/super-mario-bros.png` | `data/games/22_super-mario-bros/char-pikachu.png` |

Gameplay images retain their original aspect ratios without cropping. RepoKun
has transparent margins trimmed. These small derivatives do not alter the
canonical model renders or website covers.

GitHub's [organization profile documentation](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile)
describes the required repository/path, public visibility, and six-pin limit.
