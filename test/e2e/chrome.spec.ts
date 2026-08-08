import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test as base, chromium, type BrowserContext, type Worker } from '@playwright/test'

const extensionPath = path.resolve(import.meta.dirname, '../../dist/chrome')

const test = base.extend<{ context: BrowserContext, extensionId: string, serviceWorker: Worker }>({
  context: async ({ browserName }, use) => {
    if (browserName !== 'chromium') throw new Error('Chrome extension tests require Chromium')
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    })
    await use(context)
    await context.close()
  },
  serviceWorker: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers()
    if (!serviceWorker) serviceWorker = await context.waitForEvent('serviceworker')
    await use(serviceWorker)
  },
  extensionId: async ({ serviceWorker }, use) => {
    await use(serviceWorker.url().split('/')[2])
  }
})

let port = 0
let server: ReturnType<typeof createServer>

test.beforeAll(async () => {
  server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end('<!doctype html><title>PageTime browser test</title>')
  })
  await new Promise<void>((resolve) => server.listen(0, '0.0.0.0', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Could not start test server')
  port = address.port
})

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
})

function site(hostname: string): string {
  return `http://${hostname}:${port}`
}

async function openPopup(context: BrowserContext, extensionId: string) {
  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`)
  await expect(popup.getByText('Loadingâ€¦')).toBeHidden()
  return popup
}

async function downloadCsv(popup: Awaited<ReturnType<typeof openPopup>>): Promise<string> {
  await expect(popup.getByRole('button', { name: 'Download CSV' })).toBeEnabled()
  const downloadPromise = popup.waitForEvent('download')
  await popup.getByRole('button', { name: 'Download CSV' }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  if (!downloadPath) throw new Error('CSV download did not create a file')
  return readFile(downloadPath, 'utf8')
}

async function exportCsv(context: BrowserContext, extensionId: string): Promise<string> {
  const popup = await openPopup(context, extensionId)
  const csv = await downloadCsv(popup)
  await popup.close()
  return csv
}

function secondsFor(csv: string, hostname: string): number {
  const row = csv.split('\r\n').find(line => line.includes(`"${hostname}"`))
  if (!row) return 0
  return Number(row.split(',').at(-1)?.replaceAll('"', ''))
}

test('records a focused HTTP site in the popup CSV', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.goto(site('localhost'))
  await page.waitForTimeout(2_100)

  const csv = await exportCsv(context, extensionId)
  expect(secondsFor(csv, 'localhost')).toBeGreaterThanOrEqual(2)
})

test('does not record the extension popup page as a site', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.goto(site('localhost'))
  await page.waitForTimeout(1_100)

  const popup = await openPopup(context, extensionId)
  await popup.waitForTimeout(1_100)
  const csv = await exportCsv(context, extensionId)
  expect(csv).not.toContain('chrome-extension')
  await popup.close()
})

test('splits time when the active tab navigates to another host', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.goto(site('localhost'))
  await page.waitForTimeout(1_100)
  await page.goto(site('127.0.0.1'))
  await page.waitForTimeout(1_100)

  const csv = await exportCsv(context, extensionId)
  expect(secondsFor(csv, 'localhost')).toBeGreaterThanOrEqual(1)
  expect(secondsFor(csv, '127.0.0.1')).toBeGreaterThanOrEqual(1)
})

test('splits time when the active tab changes', async ({ context, extensionId }) => {
  const firstTab = await context.newPage()
  await firstTab.goto(site('localhost'))
  await firstTab.waitForTimeout(1_100)
  const secondTab = await context.newPage()
  await secondTab.goto(site('127.0.0.1'))
  await secondTab.waitForTimeout(1_100)
  await firstTab.bringToFront()
  await firstTab.waitForTimeout(1_100)

  const csv = await exportCsv(context, extensionId)
  expect(secondsFor(csv, 'localhost')).toBeGreaterThanOrEqual(2)
  expect(secondsFor(csv, '127.0.0.1')).toBeGreaterThanOrEqual(1)
})

test('resets data through the popup control', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.goto(site('localhost'))
  await page.waitForTimeout(1_100)
  const popup = await openPopup(context, extensionId)
  popup.once('dialog', dialog => dialog.accept())
  await popup.getByRole('button', { name: 'Reset' }).click()

  await expect(popup.getByText('No tracked time yet. Browse an HTTP or HTTPS site, then refresh.')).toBeVisible()
  await expect(popup.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
  await popup.close()
})

test('retains a focused interval until the periodic alarm flushes it', async ({ context, extensionId }) => {
  test.setTimeout(80_000)
  const page = await context.newPage()
  await page.goto(site('localhost'))
  await page.waitForTimeout(65_000)

  const csv = await exportCsv(context, extensionId)
  expect(secondsFor(csv, 'localhost')).toBeGreaterThanOrEqual(60)
})
