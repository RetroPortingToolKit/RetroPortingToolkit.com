# Site bot

`scripts/site-bot.mjs` runs on the Mac under launchd as
`com.retroportingtoolkit.site-bot`. It does two things:

- Every 15 minutes it checks a quarter of the game pages' repositories for a
  new release. It writes the release, download link and date onto the page,
  commits and pushes to main, and posts the news in #website.
- Every 30 minutes it posts page changes from any push to main in #website.

It takes no requests and never connects to Discord's gateway; it only posts.
It works in its own clone (`site-clone` in its state folder), reset to
origin/main before every pass, so it never touches anyone's checkout. There is
no local build gate: Vercel builds every push and a failed build never goes
live.

Install or restart: `scripts/install-site-bot.sh`. Health: `npm run doctor`.
Log: `~/Library/Logs/RetroPortingToolkitDiscordAgent/site-bot.log`.
