# ADR 0002: Register Chrome tracker events synchronously

## Status

Accepted

## Decision

Register all tracker event listeners in the background script's global scope before any asynchronous state restoration. Tracker work waits for that restoration before changing state.

## Consequences

Chrome can wake the Manifest V3 service worker for a tab, window, alarm, or popup event and dispatch it reliably. Firefox retains the same event behavior while its background script remains compatible.
