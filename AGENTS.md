# AGENTS.md

## Cursor Cloud specific instructions

This is a simple Node.js CLI tool (`get-submissions`) that downloads accepted submissions from [Codeforces](https://codeforces.com). There is no build step, no linter, and no test suite configured.

### Running the CLI

```bash
node bin/getSubmissions.js -h <handle> [-c <count>] [-d <directory>]
```

- Running without arguments prints usage info (exits with code 1).
- The tool requires internet access to reach the Codeforces API (`codeforces.com/api/`).
- As of 2026, Codeforces requires authentication to view most submission source code, so the scraper will report "authentication required" for many/all submissions. This is expected platform behavior, not a bug.

### Known pre-existing issue

- Using the `-d` flag in `bin/getSubmissions.js` triggers a `ReferenceError: mkdirp is not defined` because `mkdirp` is not imported in that file. Avoid `-d` when testing, or be aware of this limitation.

### No lint/test/build

- `npm test` is a placeholder that exits with code 1.
- There is no linter or build configuration in this project. See `package.json` for the only available script.
