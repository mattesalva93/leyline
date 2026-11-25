# Branch protection

GitHub keeps `main` and the `spec/**` branches from changing without a green pull request (ADR 0024, ADR 0029). The husky hooks of ADR 0006 only warn earlier, on this machine.

## Where it lives

The protection is two repository rulesets, each kept in the repository as the JSON body of GitHub's [rulesets API](https://docs.github.com/en/rest/repos/rules):

- `.github/rulesets/protect-main.json`: the rules `main` and `spec/**` share.
- `.github/rulesets/block-main-deletion.json`: the rule only `main` has.

`scripts/rulesets.test.js` fails when a workflow that runs on pull requests gains a job the ruleset does not require, so a new CI job is a required check from the start. Each required check is tied to the GitHub Actions app by its `integration_id`: a status that anyone else posts under the same name does not count.

## How to read it

On GitHub: **Settings → Rules → Rulesets**. From the terminal:

```sh
gh api repos/{owner}/{repo}/rulesets                 # the rulesets, with their ids
gh api repos/{owner}/{repo}/rulesets/<id>            # one ruleset, its rules in full
gh api repos/{owner}/{repo}/rules/branches/main      # the rules that apply to main right now
```

`{owner}/{repo}` is filled in by `gh` from the current checkout.

## How to change it

Edit the JSON in a pull request, then, once it is merged, send it to GitHub. The first time, create each ruleset:

```sh
gh api --method POST repos/{owner}/{repo}/rulesets --input .github/rulesets/protect-main.json
gh api --method POST repos/{owner}/{repo}/rulesets --input .github/rulesets/block-main-deletion.json
```

Afterwards, replace it whole by its id:

```sh
id=$(gh api repos/{owner}/{repo}/rulesets --jq '.[] | select(.name == "protect-main") | .id')
gh api --method PUT "repos/{owner}/{repo}/rulesets/$id" --input .github/rulesets/protect-main.json
```

`--input` sends the file as the request body; `--jq` keeps only the id of the ruleset with that name.
