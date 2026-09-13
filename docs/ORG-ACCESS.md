## The RetroPortingToolKit org

This repository itself lives in the `RetroPortingToolKit` GitHub org, and it
is the only repository in that org a session is credentialed for. Everything
else there, `recomp-starter` today and whatever gets added later, sits outside
the session's authorized set. That is account plumbing, not a setting anyone
forgot: the owner has checked the GitHub App and "All repositories" is already
selected, `add_repo` with push access has failed at the approval step every
time it has been tried (2026-08-24 and 2026-08-25), and the git proxy refuses
to inject a credential for those repos (403 on push). Do not re-diagnose the
owner's permissions, and do not retry the same call in a loop.

What a session can and cannot do with the rest of the org:

- **Read**: public org repos clone fine, read only, straight into the
  scratchpad. Work there.
- **GitHub API tools** are scoped the same way as git: they work against this
  repository and are denied for the rest of the org. Do not use search or
  list tools to reach around that.
- **Create a repository**: a session cannot, and could not even when the
  owner tried approving it live. The owner creates it on github.com and runs
  the first push from their own terminal; hand them the exact commands with
  paths filled in, one block, nothing interactive. After a new repo exists,
  remember the follow-up: repoint any site links that were waiting on it.
- **Author identity**: any commit destined for the org is authored as
  `Shokunin <30949000+tetrisgm@users.noreply.github.com>`, never the owner's
  personal email. GitHub's email privacy protection (GH007) rejects any push
  whose commits expose the private address; the noreply identity is the one
  the owner's own pushes use and it passes.
- **Push changes to an existing org repo**: the ferry below, proven end to
  end on 2026-08-25.

The ferry:

1. Try `add_repo` (push) once anyway; it may get fixed someday. If it errors,
   move on.
2. Do the work in a scratchpad clone and commit it there, authored as the
   noreply identity above.
3. Export with `git format-patch -1 --stdout <sha> > name.patch`, copy the
   patch into this repo's `public/`, commit and push it (that publishes it at
   `https://retroportingtoolkit.com/name.patch` about a minute later).
4. **Wait until the URL serves the real bytes before telling the owner to
   fetch.** vercel.json rewrites every unmatched path to the SPA with a 200,
   so an early `curl` downloads HTML and `git am` fails with "Patch format
   detection failed". Poll until the first bytes are `From <sha>`.
5. Hand the owner this block, with the paths filled in:

   ```sh
   cd ~/Downloads
   git clone https://github.com/RetroPortingToolKit/<repo>.git
   cd <repo>
   curl -fLO https://retroportingtoolkit.com/name.patch
   git am name.patch
   git push
   ```

6. After the owner's push lands, verify the pushed tree matches your local
   commit (`git rev-parse origin/main^{tree}` against your sha's tree), then
   remove the patch from `public/` in a follow-up commit. The ferry file is
   temporary by contract.

Do not send the patch as a chat file attachment and assume it arrived: the
owner's Downloads folder did not have it when that was tried, and the whole
detour above exists because of it.
