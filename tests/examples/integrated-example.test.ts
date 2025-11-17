import { expect } from '@playwright/test'
import { readFile } from 'fs/promises'
import { join } from 'path'

import { test } from '../testWithCoverage'

// @ts-expect-error tsc throws "Named capturing groups are only available when targeting 'ES2018' or later." here
const threeMatch = /https:\/\/unpkg\.com\/three(?<version>@[0-9.]+)?\/(?<path>.*)/
// @ts-expect-error tsc throws "Named capturing groups are only available when targeting 'ES2018' or later." here
const gainmapJSMatch = /https:\/\/unpkg\.com\/@monogrid\/gainmap-js(?<version>@[0-9.]+)?\/(?<path>.*)/

test('renders the example correctly', async ({ page, context }, testInfo) => {
  test.setTimeout(480_000) // TODO: understand why this got slow!

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
  let startTime = performance.now()
  console.log(testInfo.title, '[DEBUG] going to page')
  await page.goto('/examples/integrated/', { waitUntil: 'networkidle' })
  console.log(testInfo.title, `[DEBUG] page loaded (${(performance.now() - startTime).toFixed(2)}ms), waiting for canvas to be attached`)
  startTime = performance.now()
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 480_000 })
  console.log(testInfo.title, `[DEBUG] canvas attached (${(performance.now() - startTime).toFixed(2)}ms), taking screenshot`)
  startTime = performance.now()
  await expect(page).toHaveScreenshot('initial.png', { timeout: 480_000 })
  console.log(testInfo.title, `[DEBUG] screenshot taken (${(performance.now() - startTime).toFixed(2)}ms), zooming in`)
  startTime = performance.now()
  await page.mouse.wheel(0, -9000)
  console.log(testInfo.title, `[DEBUG] zoomed in (${(performance.now() - startTime).toFixed(2)}ms), taking screenshot`)
  startTime = performance.now()
  await expect(page).toHaveScreenshot('zoomed-in.png', { timeout: 480_000 })
  console.log(testInfo.title, `[DEBUG] zoomed in, screenshot taken (${(performance.now() - startTime).toFixed(2)}ms), zooming out`)
  startTime = performance.now()
  await page.mouse.wheel(0, 9000)
  console.log(testInfo.title, `[DEBUG] zoomed out (${(performance.now() - startTime).toFixed(2)}ms), moving mouse to 250, 250`)
  startTime = performance.now()
  await page.mouse.move(250, 250, { steps: 20 })
  console.log(testInfo.title, `[DEBUG] moved mouse to 250, 250 (${(performance.now() - startTime).toFixed(2)}ms), pressing mouse button`)
  startTime = performance.now()
  await page.mouse.down({ button: 'left' })
  console.log(testInfo.title, `[DEBUG] clicked (${(performance.now() - startTime).toFixed(2)}ms), moving mouse to 250, 500`)
  startTime = performance.now()
  await page.mouse.move(250, 500, { steps: 20 })
  console.log(testInfo.title, `[DEBUG] moved mouse to 250, 500 (${(performance.now() - startTime).toFixed(2)}ms), releasing mouse button`)
  startTime = performance.now()
  await page.mouse.up({ button: 'left' })
  console.log(testInfo.title, `[DEBUG] zoomed out, screenshot taken, moving mouse to 250, 500, clicking (${(performance.now() - startTime).toFixed(2)}ms)`)
  startTime = performance.now()
  await expect(page).toHaveScreenshot('zoomed-out-from-above.png', { timeout: 480_000 })
  console.log(testInfo.title, `[DEBUG] final screenshot taken (${(performance.now() - startTime).toFixed(2)}ms)`)
})

test('renders the WebGPU example correctly', async ({ page, context }, testInfo) => {
  test.setTimeout(480_000) // TODO: understand why this got slow!

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

  let startTime = performance.now()
  console.log(testInfo.title, '[DEBUG] going to page')
  await page.goto('/examples/integrated/webgpu.html', { waitUntil: 'networkidle' })
  console.log(testInfo.title, `[DEBUG] page loaded (${(performance.now() - startTime).toFixed(2)}ms), waiting for canvas to be attached`)
  startTime = performance.now()
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 480_000 })
  console.log(testInfo.title, `[DEBUG] canvas attached (${(performance.now() - startTime).toFixed(2)}ms), taking screenshot`)
  startTime = performance.now()
  await expect(page).toHaveScreenshot('initial.png', { timeout: 480_000 })
  console.log(testInfo.title, `[DEBUG] screenshot taken (${(performance.now() - startTime).toFixed(2)}ms), zooming in`)
  startTime = performance.now()
  await page.mouse.wheel(0, -9000)
  console.log(testInfo.title, `[DEBUG] zoomed in (${(performance.now() - startTime).toFixed(2)}ms), taking screenshot`)
  startTime = performance.now()
  await page.mouse.wheel(0, 9000)
  console.log(testInfo.title, `[DEBUG] zoomed out (${(performance.now() - startTime).toFixed(2)}ms), moving mouse to 250, 250`)
  startTime = performance.now()
  await page.mouse.move(250, 250, { steps: 20 })
  console.log(testInfo.title, `[DEBUG] moved mouse to 250, 250 (${(performance.now() - startTime).toFixed(2)}ms), pressing mouse button`)
  startTime = performance.now()
  await page.mouse.down({ button: 'left' })
  console.log(testInfo.title, `[DEBUG] clicked (${(performance.now() - startTime).toFixed(2)}ms), moving mouse to 250, 500`)
  startTime = performance.now()
  await page.mouse.move(250, 500, { steps: 20 })
  console.log(testInfo.title, `[DEBUG] moved mouse to 250, 500 (${(performance.now() - startTime).toFixed(2)}ms), releasing mouse button`)
  startTime = performance.now()
  await page.mouse.up({ button: 'left' })

  console.log(testInfo.title, `[DEBUG] final screenshot taken (${(performance.now() - startTime).toFixed(2)}ms)`)
  await expect(page).toHaveScreenshot('zoomed-out-from-above.png', { timeout: 480_000 })
})
