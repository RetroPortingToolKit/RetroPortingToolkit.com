---
title: "Submit a recomp"
summary: "Share a game project through the website or Discord and get it into the Games catalogue."
pageType: "guide"
tags: ["Community", "Contributing"]
updated: "2026-09-15"
---

Have a game recompilation or community port to share? [Submit a recomp](/?submit=recomp) to add its own page to the Games catalogue.

## From the website

Choose **Submit a recomp** at the top of Games, on the home page, or in the footer.

1. Paste the project's public **GitHub or GitLab repository URL**. Link to the repository itself, not an issue, release, or file. GitHub.com and GitLab.com are supported.
2. Optionally enter a **project name** and a short **description**. If you leave either blank, we use the repository's name or description.
3. Submit. Your game page publishes automatically, usually within a couple of minutes. The confirmation gives you its address.

Names can be up to 100 characters and descriptions up to 500. Describe what exists and what people can try; the repository remains the source for installation steps and progress. Do not include private information or upload game data.

## From Discord

Mention **RetroPortingToolkit Bot** in any channel it can read in the community server, and write **submit** followed by one repository link. Add a short description if you like. For example:

> @RetroPortingToolkit Bot submit https://github.com/your-name/your-recomp — My game port now boots and supports keyboard input.

Anyone can submit this way. Submitting a link does not grant access to edit the website. Other bot editing commands remain restricted to the team.

## Banners and screenshots

We automatically look for images in the repository README, including Markdown images, reference-style images, and HTML `<img>` tags. Relative image paths are resolved from the README. Build badges and status shields are skipped.

For Discord submissions, attach photos, a banner, or screenshots to the **same message** as the repository link, or include direct image links. Label a link **banner:** or **cover:** (or name an attachment accordingly) to prefer it as the cover. You can also use **title:** and **description:** on separate lines. Images in your message take priority over README images.

We copy up to four PNG, JPEG, WebP, or GIF images into the site: at most 4 MB each and 8 MB total. The first imported image becomes the card cover; the images also appear on the game page. Automatic imports support GitHub-hosted images, GitLab repository files, and Discord attachments. Other image hosts, SVGs, inaccessible images, and oversized files are skipped. Copying images means expiring Discord links do not break the published page.

The confirmation reports the number imported, or says the page has no artwork. Check the page after publication. The team can adjust artwork through the editor; missing images are not a promise that the team will create them. Adding images later to a README does not update an existing listing automatically—contact the team in the website channel for changes.

## Credit and review

The page says "Made by" the repository owner or namespace reported by GitHub or GitLab, linked to that profile, and summarises the README's introduction and any status or features section. That credit does not verify the identity of the person submitting the link. For Discord submissions, the moderation notice also includes your Discord username and original message; it provides a fallback if repository attribution is unavailable.

The page becomes visible without waiting for review. The team receives a notice and can confirm it with ✅ or remove it from listings with ❌. Removed pages retain their unlisted direct URL. Moderators can edit the page through the normal editor.

Submitting the same repository again does not create another page or overwrite an existing one. A removed repository cannot be resubmitted to bypass moderation; contact the team if it needs another look. If submissions are busy, wait and retry.
