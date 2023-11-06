/** @type {import('semantic-release').Options} */
module.exports = {
  branches: ['main'],
  plugins: [
    ['@semantic-release/commit-analyzer', {
      preset: 'conventionalcommits',
      releaseRules: [
        { breaking: true, release: 'major' },
        { type: 'deps', release: 'patch' }
      ],
      parserOpts: {
        noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES']
      }
    }],
    '@semantic-release/release-notes-generator',
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    '@semantic-release/npm',
    ['@semantic-release/github', {
      assets: [
        'package.json',
        '*.md',
        'dist',
        'examples',
        'wiki',
        'libultrahdr-wasm/LICENSE',
        'libultrahdr-wasm/README.md',
        'libultrahdr-wasm/build/*.js',
        'libultrahdr-wasm/build/*.ts',
        'libultrahdr-wasm/build/*.wasm'
      ]
    }],
    ['@semantic-release/git', { assets: ['package.json', 'CHANGELOG.md'] }]
  ]
}
