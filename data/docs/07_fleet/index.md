---
title: "The fleet"
summary: "The map: all 83 repositories with their roles and dependencies, the lines of descent between them, the license census, and how one project records where its code came from."
sectionTitle: "The fleet"
pageType: "reference"
tags: ["Fleet"]
updated: "2026-08-25"
---

The toolkit is 83 git repositories: twelve console projects, seven shared
components and 64 game ports. Some facts only appear when you read all of them
together. One shared launcher is pinned at 19 different commits. 48 repositories
carry no license file at all. No single repository can tell you either of those.
Start here when you need to place a repository rather than use one.

- [Every repository](/docs/fleet/repositories). All 83, grouped by role, each
  linked and each attributed to its toolchain, plus the map of which shared
  component is used by what.
- [Lineage and credit](/docs/fleet/lineage-and-credit). How the projects here
  descend from each other: the framework the others were modelled on, the code
  that is genuinely shared, and the commit each game port pins.
- [Licenses](/docs/fleet/licenses). The census, taken from the license files
  themselves, including the repositories that declare nothing and the places
  where a headline license is narrower than it looks.
- [Provenance](/docs/fleet/provenance). How one project records where every line
  of its device code came from, and what each toolchain says about firmware it
  does or does not ship.
