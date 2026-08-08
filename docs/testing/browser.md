# Browser acceptance checks

The Chrome suite is automated against a real Manifest V3 extension and its popup/CSV output:

```sh
npm run install:test-browser
npm run test:e2e:chrome
```

It uses Playwright's bundled Chromium because current Google Chrome does not support command-line extension side-loading. It proves focused-time tracking, navigation and tab hostname changes, extension-page exclusion, popup CSV/reset, and long-idle continuity through the periodic alarm.

## Chrome headed checks

Run the local HTTP sites in one terminal:

```sh
npm run test:browser:sites
```

Build the Chrome extension in another terminal:

```sh
npm run build
```

In `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/chrome`. Use the actual toolbar popup for these checks; do not navigate to the extension URL in a tab.

| Step | Expected result |
| --- | --- |
| Leave `localhost` focused for 3 seconds, click the PageTime toolbar action, and select Refresh. | The popup includes 2â€“4 seconds for `localhost`. |
| Leave `localhost` focused and untouched for 35 seconds, then click the toolbar action and select Refresh. | The popup includes at least 33 seconds for `localhost`. Repeat three times to exercise worker suspension/revival. |

Chrome does not expose a dependable service-worker lifecycle signal to browser automation, so the second check remains headed release validation. The deterministic tracker test covers matching-host state restoration separately.

## Firefox headed check

Run the local HTTP sites in one terminal:

```sh
npm run test:browser:sites
```

Build and load the Firefox extension in a separate terminal:

```sh
npm run build:firefox
```

In `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and select `dist/firefox/manifest.json`. Use the two URLs printed by the site server and check the popup CSV after each step.

Before the private-tab check, allow PageTime to run in Private Windows so the tracker can prove that it ignores private tabs.

| Step | Expected CSV result |
| --- | --- |
| Leave `localhost` focused for 3 seconds, then refresh the popup. | `localhost` gains 2â€“4 seconds. |
| Navigate that tab to `127.0.0.1`, wait 3 seconds, then refresh. | Both hosts have separate 2â€“4 second entries. |
| Open a second tab on `127.0.0.1`, switch between it and the `localhost` tab, then refresh. | Both hosts gain only their focused intervals. |
| Move one test tab to a separate Firefox window and focus each window for 3 seconds. | Only the focused window's active site gains time. |
| Switch to a browser-internal page, then refresh. | No site gains time while it is active. |
| Switch from a regular site to a private tab. | The regular site stops and the private tab is absent. |
| Focus another application for 3 seconds. | The active site does not gain those seconds. |
| Close and reopen Firefox, then refresh. | Closed-browser time is absent. |
| Reset, browse for 2 seconds, and download CSV. | Only the post-reset interval is exported. |

Sleep and lock are release checks rather than pass/fail assertions: record the result and browser version. Neither browser provides a dependable cross-platform signal that distinguishes passive reading from a sleeping or unattended device.
