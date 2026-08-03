# PageTime specification

## Problem Statement

People need a simple, trustworthy way to understand how much time they spend on websites without creating an account, syncing data, or sending browsing information to another service. PageTime must show useful totals while counting only time that represents actual foreground browsing.

## Solution

PageTime is a Chrome and Firefox browser extension that records foreground time for non-incognito HTTP(S) tabs. It stores daily seconds per normalized site entirely in browser-local storage, presents concise dashboard totals, supports a CSV download, and allows a user to reset their own stored data.

## User Stories

1. As a browser user, I want PageTime to record time only for the tab I am actively viewing, so that background tabs do not inflate my totals.
2. As a browser user, I want tracking to stop when my browser window loses focus, so that time away from the browser is excluded.
3. As a browser user, I want tracking to stop when my browser reports that I am idle or locked, so that inactive time is excluded.
4. As a browser user, I want tracking to resume when I return to active browsing, so that genuine foreground time continues to accumulate.
5. As a privacy-conscious user, I want all browsing data to stay in my browser, so that no account, sync service, or external data transfer is involved.
6. As a user, I want internal browser pages and extension pages ignored, so that only websites appear in my statistics.
7. As a user, I want incognito browsing ignored, so that private browsing remains untracked.
8. As a user, I want time grouped by calendar date, so that I can see today and recent-week usage accurately.
9. As a user, I want `www.youtube.com` and `youtube.com` grouped as one site, so that aliases do not split a site's time.
10. As a user, I want other subdomains to remain distinct, so that the dashboard does not make broader assumptions about site ownership.
11. As a user, I want the current active interval included when I open or refresh the popup, so that the displayed totals are current.
12. As a user, I want service-worker restarts to preserve attributable active time, so that browser lifecycle events do not silently undercount it.
13. As a user, I want uncertain time after an unobserved site change not assigned to the wrong site, so that accuracy is preferred over guessing.
14. As a user, I want to see my total for today, the trailing seven calendar days, or all stored time, so that I can choose a useful perspective.
15. As a user, I want the most-used sites ranked by time, so that I can quickly understand where my time went.
16. As a user, I want less-prominent sites grouped into an Others row, so that the popup stays compact.
17. As a user, I want time displayed in human-readable seconds, minutes, and hours, so that totals are immediately understandable.
18. As a user, I want to download my locally stored data as CSV, so that I can inspect or use it elsewhere.
19. As a user, I want CSV site rows to use the same `www.` normalization as the dashboard, so that the export agrees with what I see.
20. As a user, I want to reset all PageTime data after confirmation, so that I stay in control of my local history.
21. As a user, I want clear empty and error states in the popup, so that I know whether data is unavailable or simply has not been collected yet.
22. As a Chrome user, I want a Manifest V3 build, so that I can load the extension in Chrome.
23. As a Firefox user, I want a compatible Firefox build, so that I can load the extension temporarily for local use.

## Implementation Decisions

- The extension has a background tracking engine and a Svelte popup dashboard.
- Browsing data is local-only and uses a calendar-date-to-site-to-seconds mapping. It is intentionally not stored in sync storage and is never sent over the network.
- Tracker state is session-only: active Site, interval start time, and whether tracking is active. It is separate from persistent Browsing data.
- A Site is an HTTP(S) hostname with one leading `www.` removed. No public-suffix or broader registrable-domain grouping is applied; other subdomains remain distinct.
- Foreground time requires an active, non-incognito tab in a focused browser window. Idle and locked events pause tracking; the browser idle threshold is 60 seconds.
- Tab activation, navigations, window focus changes, idle-state changes, and periodic alarms drive interval flushing.
- On background initialization, a saved interval is flushed only when its saved Site equals the current active Site. A mismatch starts a new interval to avoid assigning unknown elapsed time to the wrong Site.
- The popup requests a flush before reading Browsing data. It aggregates date records for Today, a rolling seven-day window, or all time; it displays the five largest Sites plus an Others aggregate when needed.
- CSV exports the complete stored date history with stable date and site ordering, escaped cells, and normalized Site grouping.
- Reset removes persistent Browsing data after user confirmation while keeping the tracker ready to continue the currently valid interval.
- Chrome uses a Manifest V3 service worker; Firefox uses its compatible background-script configuration. Both builds share the same tracking and popup behavior.

## Testing Decisions

- Tests verify observable behavior rather than private implementation detail: accumulated seconds, normalized dashboard/export data, filtering, formatting, and URL eligibility.
- The existing utility seam covers date keys, filtering, aggregation, CSV generation, time formatting, and hostname extraction/normalization.
- The public tracker initialization seam is tested with browser-storage and active-tab doubles. It proves that a matching saved active interval is credited after a service-worker restart and would fail under the prior undercounting behavior.
- Build and type-check remain release gates for both browser targets. Manual smoke testing should load each generated extension, browse a web page, switch tabs/windows, wait through an idle transition, refresh the popup, export CSV, and reset data.

## Out of Scope

- Syncing, accounts, cloud storage, analytics, telemetry, or any transfer of browsing data outside the browser.
- Tracking incognito tabs, browser-internal pages, extension pages, file URLs, or non-HTTP(S) URLs.
- Cross-device reporting, server-side dashboards, notifications, budgets, blocking, or productivity coaching.
- Grouping arbitrary subdomains or full registrable domains beyond removing one leading `www.`.
- Guessing an attribution when a site change was not observed while the background worker was dormant.
- Richer dashboard visualizations beyond the existing compact totals and ranked list.

## Further Notes

The domain vocabulary is defined in the project's glossary: Browsing data, Foreground time, Site, and Tracker state. The foreground-time and hostname-normalization decisions are recorded in ADR 0001. Existing behavior uses browser-local persistent storage for Browsing data and session storage for Tracker state; a browser restart clears the session state, preventing time while the browser was closed from being counted.
