import * as encode from '@monogrid/gainmap-js/encode'
import * as libultrahdr from '@monogrid/gainmap-js/libultrahdr'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

/**
 * test evaluated inside browser
 *
 * @param args
 * @returns
 */
export const encodeInBrowser = async (args: Omit<encode.EncodingParametersWithCompression, 'image' | 'maxContentBoost' | 'mimeType' | 'quality'> & { file: string, mimeType?: encode.CompressionMimeType, maxContentBoost?: number, quality?: number, dynamicGainMapParameters?: Partial<encode.GainmapEncodingParameters>, dynamicSDRParameters?: { brightness?: number, contrast?: number, saturation?: number, exposure?: number } }) => {
  // load an HDR file
  const loader = new EXRLoader()
  const image = await loader.loadAsync(args.file)

  // Encode the gainmap
  const encodingResult = encode.encode({
    image,
    toneMapping: args.toneMapping,
    gamma: args.gamma,
    minContentBoost: args.minContentBoost,
    offsetHdr: args.offsetHdr,
    offsetSdr: args.offsetSdr,
    renderTargetOptions: args.renderTargetOptions,
    // this will encode the full HDR range
    maxContentBoost: args.maxContentBoost || Math.max.apply(this, encode.findTextureMinMax(image))
  })

  // test re-render
  if (args.dynamicGainMapParameters !== undefined) {
    const { maxContentBoost, minContentBoost, gamma, offsetHdr, offsetSdr } = args.dynamicGainMapParameters
    if (maxContentBoost !== undefined) encodingResult.gainMap.material.maxContentBoost = maxContentBoost
    if (minContentBoost !== undefined) encodingResult.gainMap.material.minContentBoost = minContentBoost
    if (gamma !== undefined) encodingResult.gainMap.material.gamma = gamma
    if (offsetHdr !== undefined) encodingResult.gainMap.material.offsetHdr = offsetHdr
    if (offsetSdr !== undefined) encodingResult.gainMap.material.offsetSdr = offsetSdr
    encodingResult.gainMap.render()
  }

  // test re-render
  if (args.dynamicSDRParameters !== undefined) {
    const { brightness, contrast, exposure, saturation } = args.dynamicSDRParameters
    if (brightness !== undefined) encodingResult.sdr.material.brightness = brightness
    if (exposure !== undefined) encodingResult.sdr.material.exposure = exposure
    if (saturation !== undefined) encodingResult.sdr.material.saturation = saturation
    if (contrast !== undefined) encodingResult.sdr.material.contrast = contrast
    encodingResult.sdr.render()
  }

  // obtain the RAW RGBA SDR buffer and create an ImageData
  const sdrImageData = new ImageData(encodingResult.sdr.toArray(), encodingResult.sdr.width, encodingResult.sdr.height)
  // obtain the RAW RGBA Gain map buffer and create an ImageData
  const gainMapImageData = new ImageData(encodingResult.gainMap.toArray(), encodingResult.gainMap.width, encodingResult.gainMap.height)

  // parallel compress the RAW buffers into the specified mimeType
  const mimeType = args.mimeType || 'image/jpeg'
  const quality = args.quality || 0.9

  const [sdr, gainMap] = await Promise.all([
    encode.compress({
      source: sdrImageData,
      mimeType,
      quality,
      flipY: args.flipY !== undefined ? args.flipY : true // output needs to be flipped with EXR
    }),
    encode.compress({
      source: gainMapImageData,
      mimeType,
      quality,
      flipY: args.flipY !== undefined ? args.flipY : true // output needs to be flipped with EXR
    })
  ])

  // obtain the metadata which will be embedded into
  // and XMP tag inside the final JPEG file
  const metadata = encodingResult.getMetadata()

  // embed the compressed images + metadata into a single
  // JPEG file
  const jpeg = await libultrahdr.encodeJPEGMetadata({
    ...encodingResult,
    ...metadata,
    sdr,
    gainMap
  })

  encodingResult.gainMap.dispose(true)
  encodingResult.sdr.dispose(true)

  return {
    jpeg: Array.from(jpeg),
    sdrMaterialValues: {
      toneMapping: encodingResult.sdr.material.toneMapping,
      brightness: encodingResult.sdr.material.brightness,
      contrast: encodingResult.sdr.material.contrast,
      saturation: encodingResult.sdr.material.saturation
    },
    gainMapMaterialValues: {
      maxContentBoost: encodingResult.gainMap.material.maxContentBoost,
      minContentBoost: encodingResult.gainMap.material.minContentBoost,
      gainMapMax: encodingResult.gainMap.material.gainMapMax,
      gainMapMin: encodingResult.gainMap.material.gainMapMin,
      hdrCapacityMin: encodingResult.gainMap.material.hdrCapacityMin,
      hdrCapacityMax: encodingResult.gainMap.material.hdrCapacityMax,
      offsetHdr: encodingResult.gainMap.material.offsetHdr,
      offsetSdr: encodingResult.gainMap.material.offsetSdr,
      gamma: encodingResult.gainMap.material.gamma
    }
  }
}
