import { MainModule } from '../../libultrahdr-wasm/build/libultrahdr'
// @ts-expect-error untyped
import libultrahdr from '../../libultrahdr-wasm/build/libultrahdr-esm'

let library: MainModule | undefined

/**
 * Instances the WASM module and returns it, only one module will be created upon multiple calls.
 * @category WASM
 * @group WASM
 *
 * @returns
 */
export const getLibrary = async () => {
  if (!library) {
    library = await libultrahdr() as MainModule
  }
  return library
}
