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


## Shared UChat visual system

Application screens should use the shared theme tokens in `apps/pulse-chat/src/index.css` instead of hard-coded light/dark colors. Use semantic Tailwind classes such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, and `ring-ring`. Reusable patterns include `uchat-surface`, `uchat-page-title`, `uchat-page-description`, `uchat-field`, `uchat-icon-button`, and `uchat-security-status`.

Keep the visual language consistent across chat, feed, calls, profiles, settings, creator tools, loading states, and error states: Plus Jakarta Sans typography, warm neutral surfaces, coral primary actions, rounded components, clear focus indicators, mobile-first spacing, and reduced-motion support. Avoid hard-coded gray/white/black styling where semantic theme tokens are available.

The loading screen's `SECURITY ACTIVE` indicator communicates that the app is loading with its intended security posture; it is not a claim that every endpoint or deployment is fully secured. Production readiness still requires verified server-side authorization, secrets management, rate limits, upload validation, and deployment checks.
