import { test as baseTest } from '@playwright/test'
import { randomBytes } from 'crypto'
import { writeFileSync } from 'fs'
import { mkdir } from 'fs/promises'
import { join } from 'path'

const istanbulCLIOutput = join(process.cwd(), '.nyc_output')

export function generateUUID (): string {
  return randomBytes(16).toString('hex')
}

export const test = baseTest.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      /* Deterministic math random */
      let seed = Math.PI / 4
      window.Math.random = function () {
        // const x = window.location.href.split('').map(c => c.charCodeAt(0)).reduce((v,i) => v + i, 0)
        const x = Math.sin(seed++) * 10000
        return x - Math.floor(x)
      }

      /* Collect coverage */
      window.addEventListener('beforeunload', () =>
        window.collectIstanbulCoverage(JSON.stringify(window.__coverage__))
      )

      // @ts-expect-error injecting variables
      window.TESTING = true

      /* Deterministic Font Rendering across platforms */
      let styleInjected = false
      document.addEventListener('readystatechange', (e) => {
        if (!styleInjected) {
          styleInjected = true
          const style = document.createElement('style')
          style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans&display=swap');

            #info, .lbl, .lil-gui, canvas[width="80"] {
              display: none !important;
            }

            body, html {
              margin: 0;
              padding: 0;
            }

            *, *:before, *:after {
              font-family: 'Noto Sans' !important;
              font-size: 16px !important;
              font-weight: 400 !important;
              font-kerning: none !important;
              font-style: normal !important;
              -webkit-font-smoothing: antialiased !important;
              text-rendering: geometricprecision !important;
            }`
          document.head.append(style)
        }
      })
    })
    await mkdir(istanbulCLIOutput, { recursive: true })
    await context.exposeFunction('collectIstanbulCoverage', (coverageJSON: string) => {
      if (coverageJSON) { writeFileSync(join(istanbulCLIOutput, `playwright_coverage_${generateUUID()}.json`), coverageJSON) }
    })
    await use(context)
    for (const page of context.pages()) {
      await page.evaluate(() => window.collectIstanbulCoverage(JSON.stringify(window.__coverage__)))
    }
  }
})

export const expect = test.expect
