---
title: "NESRecomp: From Faxanadu to 4 Supported Commercial Titles"
kicker: "1379.tech"
tags: []
featured: false
desc: "Four NES games and counting: how the recompiler learned to find functions in binaries that never carried a symbol."
date: "2026-03-28"
venue: "1379.tech"
group: "Project updates"
layout: "article"
links:
  - { label: "Read on 1379.tech", href: "https://1379.tech/nesrecomp-from-faxanadu-to-4-supported-commercial-titles/" }
---

The NES ecosystem's first milestone post covers the jump from a single working game to four supported commercial titles: Super Mario Bros., Faxanadu, The Legend of Zelda, and Dr. Mario.

The technical core is how the recompiler finds the code in the first place: walking the JSR/RTS call graph to discover function boundaries in 6502 binaries that carry no symbol information. For Zelda, the public zelda1-disassembly project provided leverage, an early instance of the pattern that later defined the whole toolkit, where community annotation work feeds directly into recompilation quality.

The post also notes the rough edges at this stage: Dr. Mario had a minor audio timing issue and Faxanadu a minor transparency issue. Read against the 10-title announcement two months later, this is the moment the NES work stopped being a single-game experiment and became an ecosystem.

Related: [Faxanadu](/games/faxanadu), [Super Mario Bros.](/games/super-mario-bros), [The Legend of Zelda](/games/legend-of-zelda), and [Dr. Mario](/games/dr-mario) on [NES](/hardware/nes).
