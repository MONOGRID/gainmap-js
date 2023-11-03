# 1.0.0 (2023-11-03)


### Bug Fixes

* **encode-buffers:** removes fullDisplayBoost as return value, do not convert sRGB to linear for HDR image ([f127b4f](https://github.com/MONOGRID/gainmap-js/commit/f127b4fe73efcd2ec99e67f00babc967d81471f4))
* **encode:** fixes upside-down results, adds more parameters for encoding ([21d18b9](https://github.com/MONOGRID/gainmap-js/commit/21d18b92292cb49dd6502ca9ef8c483b83f40e1f))
* **libultrahdr:** encoding expects the correct compression mimeType, throws error otherwise ([ea5b968](https://github.com/MONOGRID/gainmap-js/commit/ea5b968551de43bbb65458349041eb4aada8c11c))


### Features

* adds gainmap-js/libultrahdr for appending a gainmap to a jpeg file ([3573c86](https://github.com/MONOGRID/gainmap-js/commit/3573c86704c2cf5301d6fe0fb448c1968f18bdf7))
* **decode:** adds possibility to modify the WebGL decoding material in realtime and re-render it ([283b535](https://github.com/MONOGRID/gainmap-js/commit/283b5351c84be4f979c8a0b6dcf5741b44b45e95))
* **encode:** adds possibility to use a web worker for encoding the gainmap off the main thread ([09b12ee](https://github.com/MONOGRID/gainmap-js/commit/09b12ee61b764941f436f2ba88680ea92a236bbd))
* implements gainmap decoding from a jpeg ([8fa84d2](https://github.com/MONOGRID/gainmap-js/commit/8fa84d29a397f44dcebcabb10d263365d9b48294))
* includes libultrahdr-wasm to append the results of an encode to an sdr jpeg ([e6a63cc](https://github.com/MONOGRID/gainmap-js/commit/e6a63cc43a03f946520f552de0fa39ea36ce688d))
* **libultrahdr:** adds binding to decode a jpeg with an embedded gainmap ([f360f36](https://github.com/MONOGRID/gainmap-js/commit/f360f36c549d52925142ff7b19382d8a85300ab4))
* moves the encoding process to the GPU ([ffdd74b](https://github.com/MONOGRID/gainmap-js/commit/ffdd74bfabe60a5d709b4ad7bab0ece1149cbb8b))
* **worker:** now includes function to compress the image in the worker ([afd0728](https://github.com/MONOGRID/gainmap-js/commit/afd0728a3499c431c214d70202b93872a16da9f0))


### Performance Improvements

* **decode:** single pow operation in decode shader ([cb5d555](https://github.com/MONOGRID/gainmap-js/commit/cb5d555046eb380626a07a6f6e32796a3574ea86))
