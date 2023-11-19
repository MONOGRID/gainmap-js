/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
	root: true,
	env: {
		browser: true,
		node: true,
		es2018: true
	},
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: 'module'
	},
	extends: [
		'mdcs',
		'plugin:compat/recommended',
		'plugin:@typescript-eslint/recommended'
	],
	plugins: [
		'html',
		'import'
	],
	settings: {
		polyfills: [
			'WebGL2RenderingContext'
		]
	},
	globals: {
		__THREE_DEVTOOLS__: 'readonly',
		potpack: 'readonly',
		fflate: 'readonly',
		Stats: 'readonly',
		XRWebGLBinding: 'readonly',
		XRWebGLLayer: 'readonly',
		GPUShaderStage: 'readonly',
		GPUBufferUsage: 'readonly',
		GPUTextureUsage: 'readonly',
		GPUTexture: 'readonly',
		GPUMapMode: 'readonly',
		QUnit: 'readonly',
		Ammo: 'readonly',
		XRRigidTransform: 'readonly',
		XRMediaBinding: 'readonly',
		CodeMirror: 'readonly',
		esprima: 'readonly',
		jsonlint: 'readonly'
	},
	rules: {
		'no-throw-literal': [
			'error'
		],
		quotes: [
			'error',
			'single'
		],
		'prefer-const': [
			'error',
			{
				destructuring: 'any',
				ignoreReadBeforeAssign: false
			}
		]
	}
};
