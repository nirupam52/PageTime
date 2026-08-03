# ADR 0001: Foreground time and site normalization

## Status

Accepted

## Decision

PageTime records time only for a non-incognito HTTP(S) tab in the focused browser window. Browser idle or locked events pause tracking; the current browser setting reports idle after 60 seconds.

A site is its hostname with one leading `www.` removed. Subdomains otherwise remain distinct.

On service-worker initialization, PageTime credits a saved interval only when the saved hostname still matches the active hostname. A different hostname starts a new interval rather than guessing when the change occurred.

## Consequences

`www.youtube.com` and `youtube.com` appear as one site, including existing data shown in the popup and CSV export. Service-worker restarts retain elapsed foreground time; an unobserved navigation is not attributed to the wrong site.
