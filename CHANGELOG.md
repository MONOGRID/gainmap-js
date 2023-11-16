## [2.0.5](https://github.com/MONOGRID/gainmap-js/compare/v2.0.4...v2.0.5) (2023-11-16)


### Bug Fixes

* **jpegrloader:** rename JPEGRLoader to HDRJPEGLoader, old name kept for compatibility ([ac6e386](https://github.com/MONOGRID/gainmap-js/commit/ac6e38610886b7adec5806a7ad301bff1ec00d62))

## [2.0.4](https://github.com/MONOGRID/gainmap-js/compare/v2.0.3...v2.0.4) (2023-11-15)


### Bug Fixes

* **decode:** clamp max values in the decode shader to min/max half float ([96986be](https://github.com/MONOGRID/gainmap-js/commit/96986be23dd95825d19fac3b3de520d59d8ad936))

## [2.0.3](https://github.com/MONOGRID/gainmap-js/compare/v2.0.2...v2.0.3) (2023-11-15)


### Bug Fixes

* **gainmaploader:** fix GainMapLoader progress handler not being calculated correctly ([a8e556a](https://github.com/MONOGRID/gainmap-js/commit/a8e556ab1d465a9bd705960d175464cf8d434ea1))

## [2.0.2](https://github.com/MONOGRID/gainmap-js/compare/v2.0.1...v2.0.2) (2023-11-14)


### Bug Fixes

* **decode:** improves compatibility with browsers with no createImageBitmap ([12c7609](https://github.com/MONOGRID/gainmap-js/commit/12c7609ee815a460f95419aab328b412e759f012))
* **decoder:** fix bug when using decodeResult.renderTarget.texture as source for PMREMGenerator ([4ebb983](https://github.com/MONOGRID/gainmap-js/commit/4ebb983d5bbc7f524e4b1231f630e3714cf1f870))

## [2.0.1](https://github.com/MONOGRID/gainmap-js/compare/v2.0.0...v2.0.1) (2023-11-14)


### Bug Fixes

* **decode:** implements proper feature testing for QuadRenderer.toArray ([20109ad](https://github.com/MONOGRID/gainmap-js/commit/20109ad31977124c1169f096e8ccd36628599f89))

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
