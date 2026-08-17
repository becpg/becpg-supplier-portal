# Contributing

We welcome and appreciate your contributions to the beCPG Supplier Portal! Whether it's code,
translations, or suggestions, your help is essential for the project's success. Please follow
the guidelines below to contribute effectively.

### Getting started

1. Review our [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this
   project, you agree to abide by its terms.
2. Read [`AGENTS.md`](./AGENTS.md) before touching a file. It holds the non-negotiable rules of
   this codebase — a pull request that breaks one of them cannot be merged, however good it is
   otherwise.
3. If you have suggestions, bug reports, or want to discuss improvements, open an
   [issue](https://github.com/becpg/becpg-supplier-portal/issues). We value all contributions
   and would love to hear from you.

### The rules a pull request is checked against

* **JavaScript only.** No TypeScript, no `.ts` / `.tsx` file anywhere, including config files.
* **The stack is fixed**: Next.js (App Router), React, Tailwind CSS, framer-motion. No second
  router, no other CSS framework, no state library, no UI kit (no shadcn/ui, no Radix).
* **No i18n library.** Business labels come from beCPG in the user's locale; only the portal's
  own chrome strings live in `config/messages.js`.
* **Authentication stays server side.** No OIDC configuration in the browser, no token in
  `localStorage`, and a client component never imports the beCPG or session modules.
* **Everything in the source is English** — identifiers, comments, log messages, commit
  messages. French belongs to the interface, never to the source.
* **Accessibility is not optional**: responsive down to 360 px, a status is never conveyed by
  colour alone, every interactive element is keyboard reachable with a visible focus ring, and
  no screen is ever a bare white page or a raw stack trace.

### Submitting a pull request

1. [Fork](https://github.com/becpg/becpg-supplier-portal/fork) and clone the repository.
2. Install dependencies: `npm install`.
3. Make sure the project still builds and lints: `npm run lint && npm run build`.
4. Create a new branch: `git checkout -b my-branch-name`.
5. Make your changes, and check them against a **test** instance of beCPG PLM — never against
   production, since the portal writes real data.
6. Push to your fork and
   [submit a pull request](https://github.com/becpg/becpg-supplier-portal/compare).
7. Celebrate! Wait for your pull request to be reviewed and merged.

To increase the likelihood of your pull request being accepted:

* Keep changes focused. Consider submitting unrelated changes as separate pull requests.
* Say in the pull request which screens you exercised and on which instance. A bug fix that
  cannot be reproduced cannot be reviewed.
* Write a good commit message — one line, English, in the project format:

  ```
  [Optional: InProgress/Fix #ticket] - [Type] Description
  ```

  Types: `[Feature]` `[Bug]` `[Setup]` `[Cleanup]` `[Migration]` `[Security]` `[Merge]`

Feel free to submit Work in Progress pull requests to get early feedback or if you encounter any
blockers.

### Security issues

Do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md).

### Additional resources

* [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
* [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
* [GitHub Help](https://help.github.com)
