# [2.0.0](https://github.com/MONOGRID/gainmap-js/compare/v1.1.1...v2.0.0) (2023-11-13)


### Features

* removes libultrahdr wasm from the decoding part of the library, allows users to load JPEGR files using pure js ([#9](https://github.com/MONOGRID/gainmap-js/issues/9)) ([3ad16f9](https://github.com/MONOGRID/gainmap-js/commit/3ad16f97fec6040fdfdfb4cd5e71b1ac8e504e28))


### BREAKING CHANGES

* The encoder portion of the library has been separated and moved to `@monogrid/gainmap-js/encode`, in order to save file size on user's bundles, all encoding functions must now be imported with that path.

`JPEGRLoader` has been moved from `@monogrid/gainmap-js/libultrahdr` to `@monogrid/gainmap-js` because it now uses a pure js approach

## [1.1.1](https://github.com/MONOGRID/gainmap-js/compare/v1.1.0...v1.1.1) (2023-11-09)


### Bug Fixes

* fixes Firefox Compatibility ([1cec657](https://github.com/MONOGRID/gainmap-js/commit/1cec65708127b6fd064277f4f923fc0f65610fa2))
* **libultrahdr:** fixes circular dependency between JPEGRLoader and libultrahdr ([f30f786](https://github.com/MONOGRID/gainmap-js/commit/f30f7865fb27a601635168b8a104a9935653e758))

# [1.1.0](https://github.com/MONOGRID/gainmap-js/compare/v1.0.2...v1.1.0) (2023-11-06)


### Features

* **decode:** adds threejs loaders ([b32f02a](https://github.com/MONOGRID/gainmap-js/commit/b32f02a09d20fbd9d17b35c65cf4dba8aafc9ed5))

## [1.0.2](https://github.com/MONOGRID/gainmap-js/compare/v1.0.1...v1.0.2) (2023-11-03)


### Bug Fixes

* **release:** add publishConfig to package.json ([cffff0b](https://github.com/MONOGRID/gainmap-js/commit/cffff0b31050ab54040922748b82d97e6aa820a3))

## [1.0.1](https://github.com/MONOGRID/gainmap-js/compare/v1.0.0...v1.0.1) (2023-11-03)


### Bug Fixes

* **release:** scoped package for NPM publishing ([0e30758](https://github.com/MONOGRID/gainmap-js/commit/0e307589e51dd05e160062f2ae78fc746cbdf5aa))

# 1.0.0 (2023-11-03)

First Release
