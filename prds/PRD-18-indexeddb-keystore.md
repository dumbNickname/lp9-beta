# PRD-18 — IndexedDB per-relationship key store

> Status: see `PROGRESS.md`.

## Goal

Persist and retrieve the per-relationship AES-GCM key in IndexedDB,
keyed by relationship id, never sending it to Supabase in plaintext.

## What shipped

- Device-local key store keyed by relationship id: put, get (null if
  unknown), has, delete (for account delete / unpair, §12d).
- Small IndexedDB wrapper, no library.
- Keys persist across reloads; keys of different relationships are
  isolated (deleting one keeps the others).
- Security guarantee: key material never goes to any network call. It
  leaves the crypto layer only into the invite QR/link payload (PRD-19);
  the server only ever sees a password-wrapped blob (PRD-22).
- Out: key generation and crypto ops (PRD-17), recovery blob (PRD-22),
  UI (PRD-21).

## Decisions

- Store `CryptoKey` objects directly via structured clone, not raw
  bytes: simpler, no re-import step.
- Reads swallow errors and return null, so a corrupt/missing store does
  not throw.
- Each operation opens and closes its own connection.

## Verification

- Unit (fake IndexedDB): put/get round-trip decrypts data from the
  original key, unknown id -> null, delete, has, two-key isolation,
  persistence across a new connection.
- Review: no key material in network calls.

## Gotchas

- jsdom has no IndexedDB: tests use `fake-indexeddb` (dev dependency),
  fresh factory per test.
- Device-local storage must also be cleared by Reset account (`src/`
  AGENTS.md).

## Later changes

- Inviter keeps a temporary key per pending invite in the store; it is
  moved onto the new pair by the waiting-screen poll or any later
  relationship refresh (the poll alone failed in background tabs;
  design session 2026-10-01).
