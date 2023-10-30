# gainmap-js
A Javascript (TypeScript) Encoder/Decoder Implementation  of Adobe Gainmap Technology for storing HDR Images using an SDR Image + a gainmap

> :warning: This library **is primarly intended** for encoding and decoding gainmap images for the [three.js](https://github.com/mrdoob/three.js/) 3D Library
>
> It can be used for general encode/decode of gainmaps but it depends on the three.js library which, in itself, is quite heavy if you only use it to encode/decode gainmaps.

## What is a Gainmap?

[See here](https://gregbenzphotography.com/hdr-images/jpg-hdr-gain-maps-in-adobe-camera-raw/) for a detailed explanation, here are some relevant parts:

> A gain map is a single file with a second pseudo-image embedded in it to create an optimized result for a specific monitor. It can be used to generate the HDR version (which looks dramatically better where supported), the SDR version (without tone mapping to ensures great quality), or anything in between (to better support less capable HDR displays).

> Gain maps are not a new type of file, but rather a technology which can be embedded into a variety of image formats. There are reference specs already for the JPG, AVIF, JXL, and HEIF file formats. JPG is especially notable as it could not properly support HDR without gain maps and it offers a very useful bridge to the future (i.e. highly compatible with today’s software).

> A gain map includes:
>
> * A **base (default) image**. This can be an SDR or an HDR image (JPG gain maps are always encoded with SDR as the base). If the browser or viewing software does not understand gain maps, it will just the treat file as if it were just the base image.
> * The **gain map**. This is a secondary “image” embedded in the file. It is not a real image, but rather contains data to convert each pixel from the base image into the other (SDR or HDR) version of the image.
>* Gain map **metadata**. This tells the browser how the gain map is encoded as well as critical information to optimize rendering on any display.

## References

* [Adobe Gainmap Specification](https://helpx.adobe.com/camera-raw/using/gain-map.html)
* [Ultra HDR Image Format v1.0](https://developer.android.com/guide/topics/media/platform/hdr-image-format)
