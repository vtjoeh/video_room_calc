# Git Workflow

This project uses a two-branch model so that risky refactoring and big features
can be developed in parallel without disturbing the live site.

---

## Branches

| Branch | Purpose | What can land here |
|--------|---------|--------------------|
| `main` | Stable. Always something I'd be willing to deploy. | Bug fixes, small safe additions, documentation, finished features merged from `next`. |
| `next` | Work-in-progress. Big refactors and risky features. | Anything I want to develop without exposing it to live users. Treated as throwaway-able if needed. |

The live site is deployed manually from `main`.

---

## Tags

Tags are immutable named snapshots. Use them to mark every state that has been
(or could safely be) deployed. Naming convention: `v<major>.<minor>.<patch>`,
e.g. `v0.1.645`.

```bash
# Create an annotated tag at the current HEAD with a release note
git tag -a v0.1.646 -m "Short description of what changed"

# Push that tag (tags do NOT push automatically with `git push`)
git push origin v0.1.646

# List tags
git tag --list

# Restore the working tree to a tagged snapshot (read-only inspection)
git checkout v0.1.645     # detached HEAD, look around but don't commit here
git switch main           # back to normal
```

---

## Day-to-day cheat sheet

### Refactoring or building a big feature
```bash
git switch next
# edit files
git add -A
git commit -m "Short description"
git push                   # goes to origin/next
```

### Fixing a bug reported in the live version
```bash
git switch main
# fix the bug
git add -A
git commit -m "Fix: <description>"
git push                   # goes to origin/main
git tag -a v0.1.x -m "Hotfix: <description>"
git push origin v0.1.x
# manually deploy main to live

# bring the hotfix forward into next so it isn't lost
git switch next
git merge main
git push
```

### Shipping `next` (refactor is done and tested)
```bash
git switch main
git merge next             # bring all the refactor work into main
git push
git tag -a v0.2.0 -m "Major: <summary of what changed>"
git push origin v0.2.0
# manually deploy main to live

# next can stay around for the NEXT big thing,
# or you can delete it locally and remotely:
#   git branch -d next
#   git push origin --delete next
```

### "Everything went wrong, get me back to a known-good state"
```bash
git switch main
git status                 # see what's dirty
git stash                  # set aside any uncommitted changes (recoverable)

# Inspect a previous stable point without changing main:
git checkout v0.1.645
# look around, run the app, etc.
git switch main

# If you need to actually rewind main (DESTRUCTIVE, only safe if you haven't
# pushed the bad commits, OR you're OK force-pushing):
git reset --hard v0.1.645
```

---

## Safety rules

1. **Always check `git status` and `git branch` before committing or pushing.**
   Make sure you're on the branch you think you're on.

2. **Never `git push --force` to `main` without a deliberate plan.**
   Force-pushing rewrites history and can break the live deploy and any other
   clones (including ones you forgot about).

3. **Tag every release.** Even if you don't bump the version number, an
   annotated tag at every deploy gives you a guaranteed restore point.

4. **Don't commit secrets.** API keys, passwords, signing keys never go in the
   repo. Once pushed, they're public forever (rewriting history is painful and
   imperfect).

5. **Merge `main` into `next` periodically.** If `next` lives for weeks or
   months, hotfixes that landed on `main` need to be carried forward, and
   doing it incrementally avoids one big painful merge at the end.

---

## Useful inspection commands

```bash
git status                          # what's changed locally
git branch -vv                      # all branches + their upstreams + last commit
git log --oneline -20               # last 20 commits on current branch
git log --oneline --graph --all -20 # last 20 commits across all branches, visual
git log main..next                  # commits on next that aren't on main yet
git log next..main                  # commits on main that aren't on next yet (i.e. hotfixes to merge forward)
git diff main..next                 # full file diff between branches
git diff --stat main..next          # just the file list + line counts
git tag --list                      # all tags
git remote -v                       # all remotes (should just be 'origin')
git stash list                      # all stashed work
```

---

## When in doubt

- **Read-only commands are safe:** `git status`, `git log`, `git diff`,
  `git branch`, `git show`, `git stash list`. None of these modify anything.
- **Commit before experimenting:** A `git commit` (even a junk one) is always
  recoverable. Uncommitted changes can be lost if you `git checkout`
  something else.
- **`git stash` is the "save my work for later" button:** runs `git stash`,
  do whatever, then `git stash pop` to bring your changes back.
