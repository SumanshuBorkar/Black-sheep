/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accessories from "../accessories.js";
import type * as cloudinary from "../cloudinary.js";
import type * as designs from "../designs.js";
import type * as outfits from "../outfits.js";
import type * as products from "../products.js";
import type * as storage from "../storage.js";
import type * as wardrobe from "../wardrobe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accessories: typeof accessories;
  cloudinary: typeof cloudinary;
  designs: typeof designs;
  outfits: typeof outfits;
  products: typeof products;
  storage: typeof storage;
  wardrobe: typeof wardrobe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
