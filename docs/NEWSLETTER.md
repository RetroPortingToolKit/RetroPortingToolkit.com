# Newsletter

People subscribe on the blog page and get an email when new posts are
published. Double opt-in, one unsubscribe link in every message, and no
tracking of any kind.

## The one step still needed

Sending requires a mail provider, and provisioning one means creating an
account, which is the owner's to do. Everything else is built and configured.

1. Create an account at resend.com and verify `retroportingtoolkit.com` as a
   sending domain (it will ask for DNS records; DNS is at Porkbun).
2. Store the key and the From address, piping them so they never appear in a
   command argument or a shell history:

   ```sh
   pbpaste | vercel env add RESEND_API_KEY production
   printf 'Retro Porting Toolkit <hello@retroportingtoolkit.com>' | vercel env add NEWSLETTER_FROM production
   ```

3. Redeploy (any push to `main`, or `vercel --prod`).

Until then the form answers "The newsletter is not configured yet" rather than
accepting an address it cannot keep a promise about.

## How it fits together

| Piece | Where |
| --- | --- |
| Form | `src/components/Subscribe.tsx`, at the end of the blog list |
| Logic | `src/lib/newsletterCore.ts` — addresses, tokens, list, issue rendering |
| Endpoint | `api/newsletter.ts` — subscribe, confirm, unsubscribe |
| Send | `scripts/newsletter-send.ts`, run by hand |
| Storage | a **private GitHub gist**, `NEWSLETTER_GIST_ID` |

### Why a gist

This repository is public, so the subscriber list can never live in it. The
gist is private, is reached with the `GITHUB_TOKEN` the CMS already uses, and
needed no new account or service. It holds `subscribers.json` and `state.json`
(the last-sent timestamp). Moving to a database later means replacing
`readList`/`writeList` in `api/newsletter.ts` and the two gist helpers in the
send script; nothing else knows where the list lives.

### Why double opt-in

Anyone can type anyone else's address into a form on a public website. Nothing
is ever mailed to an address that has not clicked a confirmation link, and a
pending record that is never confirmed is dropped after fourteen days.

Confirm and unsubscribe links carry an HMAC-signed token rather than a lookup
key: nothing has to be stored to issue one, an edited or expired link simply
fails to verify, and an unsubscribe link keeps working even if the list moves.

### Privacy

Addresses are never written to the repository, never logged (failures are
reported by list index), and the subscribe endpoint answers identically whether
or not an address is already subscribed, so it cannot be used to test whether
someone is on the list.

## Sending an issue

There is no scheduler on purpose: this repository's contract forbids adding
one, and an unattended mailer that fails silently is the exact failure that rule
prevents. Sending is a deliberate act.

```sh
npm run newsletter:send -- --dry-run   # what would go out, and to how many
npm run newsletter:send                # send it
npm run newsletter:send -- --since=2026-09-01   # override the last-sent mark
```

It picks up every non-draft post in `data/blog` dated after the last send, and
advances the last-sent mark **only** when every message succeeded, so a partial
failure can be re-run without the same posts counting as already sent.

The script needs the same env vars as the endpoint. Pull them locally with
`vercel env pull .env.local` (git-ignored) rather than copying secrets by hand.

## Feeds

The same posts are published as RSS, Atom and JSON Feed. The RSS button beside
the Blog heading and in the footer points at `/rss.xml`; `/rss`, `/feed`,
`/feed.xml` and `/atom` are rewrites onto the same files.
