# Security Policy

## Reporting a vulnerability
Please do not disclose exploitable vulnerabilities publicly before the maintainer has had a reasonable opportunity to investigate. Open a private GitHub security advisory if enabled for this repository, or contact the repository owner directly.

## Security controls in the current UChat deployment
- Shared server-side post visibility checks for post interactions.
- Block-aware feed filtering.
- Validation and bounds for selected post IDs, search queries, comments, and feed pagination.
- A visible security notice in the application shell.

## Important limitations
These controls do not guarantee that the application cannot be compromised. The visible security banner is informational, not a security boundary. Continue reviewing authentication, authorization, rate limiting, upload handling, session configuration, secrets management, and abuse controls. Test access rules using separate accounts before production use.

## Secrets
Never commit `.env.local`, API keys, access tokens, private keys, production credentials, or user data. Use deployment secrets and rotate any credential that may have been exposed.
