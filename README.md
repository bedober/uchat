# UChat

UChat is a chat and social platform hosted at [uchat.zite.so](https://uchat.zite.so).

## Repository contents

This repository contains the UChat Pulse Chat application source, shared UI components, app configuration, and security documentation.

- Application: `apps/pulse-chat/`
- Shared UI components: `packages/components/`
- Security policy and review notes: [SECURITY.md](SECURITY.md)

## Development notes

The application was built for the Zite runtime and uses Zite-generated endpoint bindings and platform integrations. The source is available here, but a standalone deployment outside Zite may require replacing those platform-specific services and configuring its backend/authentication equivalents.

Install dependencies from the repository root using the package manager and lockfile appropriate to your environment. Configure required platform credentials through a secret manager; do not commit environment files or production secrets.

## Security

The app includes server-side checks for selected feed interactions, block-aware feed filtering, bounded input validation, and a visible security notice. These controls are not a guarantee of invulnerability. Review [SECURITY.md](SECURITY.md) and test authorization, abuse controls, session handling, uploads, and deployment configuration before production changes.
