import { expect } from '@playwright/test'
import { readFile } from 'fs/promises'
import { join } from 'path'

import { test } from '../testWithCoverage'

// @ts-expect-error tsc throws "Named capturing groups are only available when targeting 'ES2018' or later." here
const threeMatch = /https:\/\/unpkg\.com\/three(?<version>@[0-9.]+)?\/(?<path>.*)/
// @ts-expect-error tsc throws "Named capturing groups are only available when targeting 'ES2018' or later." here
const gainmapJSMatch = /https:\/\/unpkg\.com\/@monogrid\/gainmap-js(?<version>@[0-9.]+)?\/(?<path>.*)/

test('renders the example correctly', async ({ page, context }) => {
  test.slow() // TODO: understand why this got slow!

  // Capture console messages
  page.on('console', msg => {
    const type = msg.type()
    const text = msg.text()
    const location = msg.location()
    console.log(`[Browser ${type.toUpperCase()}] ${text}`)
    if (location.url) {
      console.log(`  at ${location.url}:${location.lineNumber}:${location.columnNumber}`)
    }
  })

  await context.route(threeMatch, async (route, request) => {
    const match = threeMatch.exec(request.url())
    const path = match?.groups?.path
    if (path) {
      const body = await readFile(join('./node_modules/three/', path))
      return route.fulfill({ body, status: 200, contentType: 'application/javascript' })
    }
    return route.continue()
  })
  await context.route(gainmapJSMatch, async (route, request) => {
    const match = gainmapJSMatch.exec(request.url())
    const path = match?.groups?.path
    if (path) {
      const body = await readFile(join('.', path))
      return route.fulfill({ body, status: 200, contentType: 'application/javascript' })
    }
    return route.continue()
  })
  console.log('[DEBUG] going to page')
  await page.goto('/examples/integrated/', { waitUntil: 'networkidle' })
  console.log('[DEBUG] page loaded, waiting for canvas to be attached')
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 120_000 })
  console.log('[DEBUG] canvas attached, taking screenshot')
  await expect(page).toHaveScreenshot('initial.png', { timeout: 120_000 })
  console.log('[DEBUG] screenshot taken, zooming in')
  await page.mouse.wheel(0, -9000)
  console.log('[DEBUG] zoomed in, taking screenshot')
  await expect(page).toHaveScreenshot('zoomed-in.png', { timeout: 120_000 })
  console.log('[DEBUG] zoomed in, screenshot taken, zooming out')
  await page.mouse.wheel(0, 9000)
  console.log('[DEBUG] zoomed out, moving mouse to 250, 250')
  await page.mouse.move(250, 250, { steps: 20 })
  console.log('[DEBUG] moved mouse to 250, 250, pressing mouse button')
  await page.mouse.down({ button: 'left' })
  console.log('[DEBUG] clicked, moving mouse to 250, 500')
  await page.mouse.move(250, 500, { steps: 20 })
  console.log('[DEBUG] moved mouse to 250, 500, releasing mouse button')
  await page.mouse.up({ button: 'left' })
  console.log('[DEBUG] zoomed out, screenshot taken, moving mouse to 250, 500, clicking')
  await expect(page).toHaveScreenshot('zoomed-out-from-above.png', { timeout: 120_000 })
})
