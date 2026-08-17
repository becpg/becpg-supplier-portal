# Security Policy

## Reporting a Vulnerability

If you discover any (suspected) security vulnerabilities, please promptly report them to
**[security@becpg.fr](mailto:security@becpg.fr)**. Do not open a public issue: the portal is
internet-facing and holds supplier data, so a disclosed vulnerability is exploitable the moment
it is published.

We will make every effort to respond within 48 hours. Upon confirmation of the issue, we will
expedite the release of a patch, aiming to resolve the issue as quickly as possible. The release
timeline may vary based on complexity but historically occurs within a few days.

Useful in a report: the affected route (`/api/…`), the portal version returned by
`GET /api/health`, and whether the instance runs with real OIDC or with `DEV_FAKE_AUTH`.

## Supported Versions

All security fixes are integrated into the trunk. The upcoming release will incorporate the
latest security patches.

## Scope notes

The following are by design and are not vulnerabilities:

* `DEV_FAKE_AUTH` bypasses OIDC — it is a development-only switch and the handler refuses to
  run when `NODE_ENV=production`.
* The `TEST` banner cannot be dismissed on a test instance.
* Error pages show an opaque `digest` and never the underlying message, which can carry a
  `nodeRef` or a webscript URL.
