import {
  HalfFloatType,
  LinearSRGBColorSpace,
  SRGBColorSpace
} from 'three'

import { Constructor, QuadRendererTextureOptions } from '../../core'
import { DecodeParameters } from './types'

/**
 * Configuration for decode function
 */
export interface DecodeConfig<TRenderer extends Constructor, TQuadRenderer, TMaterial> {
  renderer: TRenderer
  createMaterial: (params: DecodeParameters<InstanceType<TRenderer>>) => TMaterial
  createQuadRenderer: (params: {
    width: number
    height: number
    type: typeof HalfFloatType
    colorSpace: typeof LinearSRGBColorSpace
    material: TMaterial
    renderer: InstanceType<TRenderer>
    renderTargetOptions?: QuadRendererTextureOptions
  }) => TQuadRenderer
}

/**
 * Shared decode implementation factory
 * Creates a decode function that prepares a QuadRenderer with the given parameters
 */
export function createDecodeFunction<TRenderer extends Constructor, TQuadRenderer, TMaterial> (config: DecodeConfig<TRenderer, TQuadRenderer, TMaterial>) {
  return (params: DecodeParameters<InstanceType<TRenderer>>): TQuadRenderer => {
    const { sdr, gainMap, renderer } = params

    if (sdr.colorSpace !== SRGBColorSpace) {
      console.warn('SDR Colorspace needs to be *SRGBColorSpace*, setting it automatically')
      sdr.colorSpace = SRGBColorSpace
    }
    sdr.needsUpdate = true

    if (gainMap.colorSpace !== LinearSRGBColorSpace) {
      console.warn('Gainmap Colorspace needs to be *LinearSRGBColorSpace*, setting it automatically')
      gainMap.colorSpace = LinearSRGBColorSpace
    }
    gainMap.needsUpdate = true

    const material = config.createMaterial({
      ...params,
      sdr,
      gainMap
    })

    const quadRenderer = config.createQuadRenderer({
      width: sdr.image.width,
      height: sdr.image.height,
      type: HalfFloatType,
      colorSpace: LinearSRGBColorSpace,
      material,
      renderer,
      renderTargetOptions: params.renderTargetOptions
    })

    return quadRenderer
  }
}
