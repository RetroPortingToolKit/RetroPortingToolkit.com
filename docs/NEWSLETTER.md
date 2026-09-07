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
export NEWSLETTER_STORE_KEY="$(security find-generic-password -s retroportingtoolkit-newsletter-store-key -w)"
export GITHUB_TOKEN="$(gh auth token)"
```

**Every secret is in the login Keychain, and that is not a convenience.**
Vercel environment variables are write-only: `vercel env pull` returns them
empty, so a value that exists only in Vercel is a value nobody can ever read
again. `NEWSLETTER_SECRET` had to be rotated on 2026-09-07 for exactly that
reason — the original was piped straight into Vercel and was gone. Anything
added later goes into the Keychain at the same time it goes into Vercel.

`NEWSLETTER_STORE_KEY` is the one where that rule stops being a convenience.
`NEWSLETTER_SECRET` can be rotated at the cost of invalidating outstanding
confirm links, but the store key is the only thing that can read the subscriber
list: lose it and the subscribers are gone for good.

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
| Storage | a **secret GitHub gist**, `NEWSLETTER_GIST_ID` |
| At rest | `src/lib/newsletterStore.ts` — AES-256-GCM over what that gist holds |

### Why a gist

This repository is public, so the subscriber list can never live in it. The
gist is reached with the `GITHUB_TOKEN` the CMS already uses and needed no new
account or service. It is *secret* rather than private, which is why its
contents are encrypted; see below. It holds `subscribers.json` and `state.json`
(the last-sent timestamp, which is not secret and stays in the clear). Moving
to a database later means replacing `readList`/`writeList` in
`api/newsletter.ts` and the two gist helpers in the send script; nothing else
knows where the list lives.

### Why double opt-in

Anyone can type anyone else's address into a form on a public website. Nothing
is ever mailed to an address that has not clicked a confirmation link, and a
pending record that is never confirmed is dropped after fourteen days.

Confirm and unsubscribe links carry an HMAC-signed token rather than a lookup
key: nothing has to be stored to issue one, an edited or expired link simply
fails to verify, and an unsubscribe link keeps working even if the list moves.

### Privacy

Addresses are never written to the repository and never logged (failures are
reported by list index). The subscribe endpoint answers identically whether or
not an address is already subscribed — same status, same body.

It is worth being precise about what that does and does not buy, because the
claim here used to be stronger than the code. The *reply* is identical; the
*time taken* to produce it was not. A confirmed address did one GitHub read and
returned; anything else did a read, a write and a full SMTP send, which is a
five-to-ten-fold difference and made a single request into a membership oracle.
`SUBSCRIBE_FLOOR_MS` in `api/newsletter.ts` now holds every answer for at least
1.2 seconds, which collapses that tell but does not make the endpoint
constant-time. Treat it as expensive to probe, not impossible.

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

## The subscriber list at rest

The list is encrypted before it is written. What sits in the gist is an
envelope, self-describing so a later version can change what is inside it:

```json
{ "v": 1, "iv": "<base64url>", "ct": "<base64url>" }
```

AES-256-GCM through Web Crypto (`src/lib/newsletterStore.ts`), a fresh 96-bit
nonce for every single write, and an authentication tag checked on every read.
Web Crypto rather than `node:crypto` because the same file has to run in the
Vercel function and under `node --experimental-strip-types` for the send
script. GCM rather than CBC because it authenticates as well as conceals.

The AES key is the SHA-256 of `NEWSLETTER_STORE_KEY`. That is a plain hash and
not a password KDF, deliberately: the env var is a randomly generated secret,
not a phrase somebody remembers, so there is no small guess space for PBKDF2 or
scrypt's work factor to defend, and the hash is only there to turn a string of
any length into exactly the 32 bytes AES-256 wants. If that value ever becomes
something a person chose, it has to become a real KDF.

This is what closes the hole the storage started with. The gist was created
`public: false`, which is GitHub's *secret* gist and not a private one: hidden
from search, but readable by anyone who learns the id, without authenticating.
The id was the entire protection — obscurity, not access control. Now the id
buys ciphertext.

**Reads are backward compatible and writes are not.** A plain JSON array still
reads, which is what made this safe to put over a list that already had a live
subscriber in it; every write produces an envelope once the key is set. So the
gist converts itself on the first subscribe, confirm or unsubscribe after the
key is in place, not on the deploy. With no key configured at all, both
directions fall back to plaintext and the newsletter keeps working —
`npm run newsletter:send` warns on every run while that is the case.

Nothing unreadable is ever reported as an empty list. A wrong key, an altered
file, an envelope with no key configured: all of them throw. The caller's next
act is to write the list back, so an empty list would make itself true.

### Setting the key

Generate one, put it in the login Keychain, and give Vercel the same bytes by
reading them back out of the Keychain, so the two copies cannot drift:

```sh
openssl rand -base64 32          # generate one and copy it

security add-generic-password -s retroportingtoolkit-newsletter-store-key -a "$USER" -w
                                 # paste it at the prompt

security find-generic-password -s retroportingtoolkit-newsletter-store-key -w \
  | tr -d '\n' | vercel env add NEWSLETTER_STORE_KEY production
```

A Vercel environment variable only reaches the function on the **next**
deployment, so set it before the push that ships this, or redeploy afterwards.
Until the function has the key it keeps writing plaintext, which is the
pre-encryption behaviour and not a failure.

### What this still does not fix

The plaintext that was in the gist before is still in its **revision history**,
and anyone with the id can read that. Encrypting from here does not retract
what has already been published. Getting rid of it means deleting the gist,
creating a new one, and putting the new id in the Keychain and in Vercel; the
list is small enough that this is worth doing.

And losing `NEWSLETTER_STORE_KEY` loses the list. That is not a flaw in the
scheme, it is the scheme — which is why it goes in the Keychain, where it can
still be read, and not only into Vercel, where it cannot.
