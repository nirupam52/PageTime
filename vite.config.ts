import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import webExtension from 'vite-plugin-web-extension'

function generateManifest(browser: string) {
  const base = {
    manifest_version: 3,
    name: 'PageTime',
    version: '2.0.0',
    description: 'Track time spent across websites',
    permissions: ['storage', 'tabs', 'alarms'],
    action: {
      default_popup: 'src/popup/index.html',
      default_title: 'PageTime'
    }
  }

  if (browser === 'firefox') {
    return {
      ...base,
      // Firefox MV3 uses scripts (background page) rather than service_worker
      background: { scripts: ['src/background/index.ts'] },
      browser_specific_settings: {
        gecko: { id: 'pagetime@pagetime.dev', strict_min_version: '115.0' }
      }
    }
  }

  return {
    ...base,
    background: { service_worker: 'src/background/index.ts', type: 'module' }
  }
}

export default defineConfig(({ mode }) => {
  const browser = mode

  return {
    plugins: [
      svelte(),
      webExtension({
        manifest: () => generateManifest(browser),
        browser
      })
    ],
    build: {
      outDir: `dist/${browser}`,
      emptyOutDir: true,
      sourcemap: false
    }
  }
})
