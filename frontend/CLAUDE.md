# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Build: `npm run build`
- Dev: `npm run dev`
- Lint: `npm run lint` or `npm run lint-fix` (to fix)
- Test: `npm run test` or `npm test -- -t "test name"` for a specific test
- Format: `npm run prettier`

## Code Style

- TypeScript for type safety
- NextJS React application structure with /app directory
- State management with Valtio (proxy-based state)
- Tabs: 4 spaces
- Max line length: 120 characters
- Single quotes for strings, double quotes for JSX
- Semicolons required
- Error handling with try/catch blocks
- Imports grouped: React, external libs, internal modules
- Use interfaces for type definitions
- Self-closing components when childless
- Use React hooks for state/effects
- Blockchain interactions via hooks (useWalletConnection, useChannelCreate, etc.)
