# PageTime

A local-only browser extension that tracks time spent on HTTP and HTTPS sites.

## Try it locally

```sh
npm install
npm run build
```

In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, then select `dist/chrome`.

For Firefox, run `npm run build:firefox`, open `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on**, then choose `dist/firefox/manifest.json`.

Browse a site for a minute, then open PageTime from the toolbar. Use Refresh to include the active page immediately. The popup can show today, the last seven days, or all stored data; it also supports CSV export and a local reset.

## Checks

```sh
npm run lint
npm test
npm run typecheck
npm run build:all
```
