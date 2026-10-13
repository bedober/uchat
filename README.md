# UChat

UChat is a chat and social platform currently hosted at [uchat.zite.so](https://uchat.zite.so).

## Repository contents

This repository contains the UChat application source under `apps/pulse-chat/` and shared UI components under `packages/components/`. Zite-generated runtime files, workspace secrets, and unrelated applications are intentionally excluded.

The project uses Zite-specific APIs and runtime integration. A standalone deployment outside Zite may require additional runtime configuration and environment variables.

## Security work included

- Security notice banner in the application shell.
- Shared server-side post visibility checks for comments, gifts, likes, and post-liker lookups.
- Block-aware feed filtering.
- Input validation and bounds for selected post IDs, search queries, comments, and feed pagination.
- Security guidance in [SECURITY.md](SECURITY.md).

## Important

These improvements do not guarantee that the application cannot be compromised. The banner is informational, not a security boundary. Rate limiting, production secret configuration, upload handling, session settings, and further authorization testing should still be reviewed.

Never commit `.env.local`, API keys, access tokens, private keys, production credentials, or user data.
