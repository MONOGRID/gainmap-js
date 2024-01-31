import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',

    // Emulates the user locale.
    locale: 'en-GB',

    // Emulates the user timezone.
    timezoneId: 'Europe/Paris'
  },

  // expect timeout to 40 seconds
  expect: {
    timeout: 40 * 1000
  },

  // test timeout to 60 seconds
  timeout: 60 * 1000,

  // https://github.com/microsoft/playwright/issues/7575#issuecomment-1693400652
  // same screenshot name across platforms
  snapshotPathTemplate: 'tests/__snapshots__/{testFilePath}/{projectName}-{arg}{ext}',

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--font-render-hinting=none'] }, viewport: { width: 500, height: 500 } }
    }

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'], launchOptions: { args: ['--font-render-hinting=none'] } },
    //   testIgnore: ['**/panolens/**'] // FIXME: these tests don't work in this browser
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   testIgnore: ['**/panolens/**'] // FIXME: these tests don't work in this browser
    // }

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run test:startserver',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    env: {
      PLAYWRIGHT_TESTING: 'true'
    }
  }
})
