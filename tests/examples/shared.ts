import type { BrowserContext } from '@playwright/test'
import { readFile } from 'fs/promises'
import { join } from 'path'

// @ts-expect-error tsc throws "Named capturing groups are only available when targeting 'ES2018' or later." here
export const threeMatch = /https:\/\/unpkg\.com\/three(?<version>@[0-9.]+)?\/(?<path>.*)/
// @ts-expect-error tsc throws "Named capturing groups are only available when targeting 'ES2018' or later." here
export const gainmapJSMatch = /https:\/\/unpkg\.com\/@monogrid\/gainmap-js(?<version>@[0-9.]+)?\/(?<path>.*)/

export async function setupRoutes (context: BrowserContext) {
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
}
