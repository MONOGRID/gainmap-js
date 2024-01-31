import { expect } from '@playwright/test'
import { readFile } from 'fs/promises'
import { join } from 'path'

import { test } from '../testWithCoverage'

const threeMatch = /https:\/\/unpkg\.com\/three(?<version>@[0-9.]+)?\/(?<path>.*)/
const gainmapJSMatch = /https:\/\/unpkg\.com\/@monogrid\/gainmap-js(?<version>@[0-9.]+)?\/(?<path>.*)/

test('renders the example correctly', async ({ page, context }) => {
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

  await page.goto('/examples/integrated/', { waitUntil: 'networkidle' })

  await expect(page.locator('canvas').first()).toBeAttached()

  await expect(page).toHaveScreenshot('initial.png')

  await page.mouse.wheel(0, -9000)

  await expect(page).toHaveScreenshot('zoomed-in.png')

  await page.mouse.wheel(0, 9000)

  await page.mouse.move(250, 250, { steps: 20 })
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(250, 500, { steps: 20 })
  await page.mouse.up({ button: 'left' })

  await expect(page).toHaveScreenshot('zoomed-out-from-above.png')
})
