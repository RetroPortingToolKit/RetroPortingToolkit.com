# Newsletter

People subscribe on the blog page and get an email when new posts are
published. Double opt-in, one unsubscribe link in every message, and no
tracking of any kind.

## Sending

Mail goes out over SMTP through MXroute, which already hosts the owner's mail.
Nothing was signed up for and no third-party mail API is involved: the account,
the sending reputation and the management credentials in
`~/.config/stack/mxroute.env` already existed, so the newsletter uses them.

What was provisioned on 2026-09-07, recorded here because none of it is visible
from the repository:

- `retroportingtoolkit.com` added to the MXroute account, after proving
  ownership with a `_da-verify-*` TXT record at Porkbun.
- Mailbox `newsletter@retroportingtoolkit.com`, capped at 500 messages a day so
  a bug cannot empty the account's quota. Its password is in the login Keychain
  as service `retroportingtoolkit-smtp`.
- DNS at Porkbun: DKIM at `x._domainkey` (selector `x`, MXroute's key), SPF
  extended from `include:_spf.porkbun.com` to also carry `include:mxroute.com`,
  and a `_dmarc` record at `p=none`. **MX was deliberately left pointing at
  Porkbun forwarding** — this domain sends mail, it does not receive it, and
  repointing MX would have broken the owner's existing forwarding.

`p=none` is monitoring only. Move it to `quarantine` once a few issues have
gone out and the DMARC reports look clean.

### Sending an issue

`npm run newsletter:send` needs the transport in its environment. The password
comes out of the Keychain so it is never written to a file in the repo:

```sh
export NEWSLETTER_SMTP_HOST=shadow.mxrouting.net
export NEWSLETTER_SMTP_PORT=587
export NEWSLETTER_SMTP_USER=newsletter@retroportingtoolkit.com
export NEWSLETTER_FROM="Retro Porting Toolkit <newsletter@retroportingtoolkit.com>"
export NEWSLETTER_SMTP_PASS="$(security find-generic-password -s retroportingtoolkit-smtp -w)"
export NEWSLETTER_SECRET="$(security find-generic-password -s retroportingtoolkit-newsletter-secret -w)"
export NEWSLETTER_GIST_ID="$(security find-generic-password -s retroportingtoolkit-newsletter-gist -w)"
export GITHUB_TOKEN="$(gh auth token)"
```

**Every secret is in the login Keychain, and that is not a convenience.**
Vercel environment variables are write-only: `vercel env pull` returns them
empty, so a value that exists only in Vercel is a value nobody can ever read
again. `NEWSLETTER_SECRET` had to be rotated on 2026-09-07 for exactly that
reason — the original was piped straight into Vercel and was gone. Anything
added later goes into the Keychain at the same time it goes into Vercel.

There is no scheduler and there must not be one: this repo's contract forbids
adding a recurring job, and an unattended mailer that fails silently is the
exact failure that rule exists to prevent.

## How it fits together

| Piece | Where |
| --- | --- |
| Form | `src/components/Subscribe.tsx`, at the end of the blog list |
| Logic | `src/lib/newsletterCore.ts` — addresses, tokens, list, issue rendering |
| Mail | `src/lib/newsletterMail.ts` — SMTP, server-only, never in the browser bundle |
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

## Known weakness: the subscriber list

The list lives in a GitHub gist created with `public: false`. That is GitHub's
*secret* gist, which is not the same as private: it is hidden from search, but
anyone who learns the gist id can read it, without authenticating. The id is
held in Vercel and in the Keychain and appears in no public artefact, so the
list is protected by that id staying unknown — obscurity, not access control.

For a list of other people's email addresses that is thinner than it should be.
The fix that does not require signing up for anything is to encrypt
`subscribers.json` before it is written, with a key alongside the others in the
Keychain and in Vercel; then the gist id leaking exposes ciphertext. That is not
done yet, and it should be before the list is more than a handful of people.
