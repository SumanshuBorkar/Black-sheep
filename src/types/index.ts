/**
 * BLAX SHEEP — Shared TypeScript Types
 *
 * These types mirror the Convex schema and are used throughout
 * the frontend. Keeping them here means one place to update
 * if the data model changes.
 */

import type { Id } from "../../convex/_generated/dataModel";

// ─── Enums (as const objects for runtime use + type safety) ──────────────────

export const PRODUCT_CATEGORIES = [
  "jackets",
  "pants",
  "shirts",
  "shoes",
  "glasses",
  "accessories",
  "other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CONDITIONS = ["mint", "good", "fair", "worn"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const PRODUCT_STATUSES = ["available", "sold"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ACCESSORY_TYPES = [
  "embroidery_patch",
  "pvc_patch",
  "dtf_sticker",
  "metal_piece",
  "enamel_pin",
  "bleach_art",
  "shoe_customisation",
] as const;
export type AccessoryType = (typeof ACCESSORY_TYPES)[number];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const OUTFIT_SLOT_CATEGORIES = [
  "headwear",
  "outerwear",
  "top",
  "bottom",
  "footwear",
  "accessory",
] as const;
export type OutfitSlotCategory = (typeof OUTFIT_SLOT_CATEGORIES)[number];

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface ProductImage {
  _id:         Id<"product_images">;
  productId:   Id<"products">;
  storageId:   string;
  url:         string;
  angle:       "front" | "back" | "detail" | "flat" | "lifestyle";
  isPrimary:   boolean;
  sortOrder:   number;
  blurDataUrl?: string;
  width:       number;
  height:      number;
}

export interface Measurements {
  chest?:    number;
  waist?:    number;
  hips?:     number;
  length?:   number;
  shoulder?: number;
  sleeve?:   number;
  inseam?:   number;
  unit:      "cm" | "inches";
}

export interface Product {
  _id:            Id<"products">;
  _creationTime:  number;
  slug:           string;
  title:          string;
  description:    string;
  category:       ProductCategory;
  subCategory?:   string;
  brand?:         string;
  size:           string;
  sizeSystem:     "IN" | "EU" | "US" | "UK" | "ONE_SIZE";
  color?:         string;
  material?:      string;
  condition:      ProductCondition;
  originalPrice:  number;
  sellingPrice:   number;
  status:         ProductStatus;
  isCustomizable: boolean;
  weight?:        number;
  tags:           string[];
  measurements?:  Measurements;
  // Joined data (from product_images table)
  images?:        ProductImage[];
  primaryImage?:  ProductImage;
}

export interface Accessory {
  _id:              Id<"accessories">;
  _creationTime:    number;
  slug:             string;
  title:            string;
  description:      string;
  type:             AccessoryType;
  price:            number;
  stock:            number;
  imageStorageId:   string;
  imageUrl:         string;
  cutoutStorageId:  string;
  cutoutUrl:        string;
  widthMm:          number;
  heightMm:         number;
  status:           "available" | "out_of_stock" | "discontinued";
  blurDataUrl?:     string;
  imageWidth:       number;
  imageHeight:      number;
}

export interface AccessoryPlacement {
  accessoryId: Id<"accessories">;
  face:        "front" | "back";
  xPercent:    number;    // 0–100
  yPercent:    number;    // 0–100
  rotation:    number;    // degrees
  scaleX:      number;
  scaleY:      number;
  zIndex:      number;
}

export interface CustomDesign {
  _id:                    Id<"custom_designs">;
  _creationTime:          number;
  userId:                 string;
  productId:              Id<"products">;
  status:                 "draft" | "saved" | "in_wardrobe" | "ordered";
  placements:             AccessoryPlacement[];
  previewFrontStorageId?: string;
  previewFrontUrl?:       string;
  previewBackStorageId?:  string;
  previewBackUrl?:        string;
  totalAccessoryCost:     number;
  updatedAt:              number;
}

export interface WardrobeItem {
  _id:          Id<"wardrobe">;
  _creationTime: number;
  userId:       string;
  productId:    Id<"products">;
  designId?:    Id<"custom_designs">;
  addedAt:      number;
  // Joined data
  product?:     Product;
  design?:      CustomDesign;
}

export interface OutfitSlot {
  category:   OutfitSlotCategory;
  productId?: Id<"products">;
  layerOrder: number;
  // Joined
  product?:   Product;
}

export interface OutfitBuild {
  _id:              Id<"outfit_builds">;
  _creationTime:    number;
  userId:           string;
  title?:           string;
  selectedSize:     string;
  slots:            OutfitSlot[];
  previewStorageId?: string;
  previewUrl?:      string;
  isPublic:         boolean;
  updatedAt:        number;
}

export interface ShippingAddress {
  name:          string;
  phone:         string;
  addressLine1:  string;
  addressLine2?: string;
  city:          string;
  state:         string;
  pincode:       string;
}

export interface OrderAccessoryItem {
  accessoryId:    Id<"accessories">;
  accessoryTitle: string;
  quantity:       number;
  unitPrice:      number;
}

export interface OrderItem {
  productId:        Id<"products">;
  designId?:        Id<"custom_designs">;
  productTitle:     string;
  productSize:      string;
  productPrice:     number;
  accessoryCost:    number;
  lineTotal:        number;
  snapshotImageUrl: string;
  accessories:      OrderAccessoryItem[];
}

export interface Order {
  _id:                Id<"orders">;
  _creationTime:      number;
  userId:             string;
  razorpayOrderId:    string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status:             OrderStatus;
  items:              OrderItem[];
  subtotal:           number;
  shippingCost:       number;
  totalAmount:        number;
  currency:           string;
  shippingAddress:    ShippingAddress;
  notes?:             string;
  trackingId?:        string;
  trackingUrl?:       string;
  updatedAt:          number;
}

// ─── UI / Component Types ─────────────────────────────────────────────────────

// Used in the editor to track what's on the canvas
export interface EditorState {
  activeDesignId:  Id<"custom_designs"> | null;
  activeFace:      "front" | "back";
  placements:      AccessoryPlacement[];
  isDirty:         boolean;   // Unsaved changes?
  isSaving:        boolean;
  activeCategory:  AccessoryType | null;
}

// Product filter state (shop page)
export interface ProductFilters {
  category?:  ProductCategory;
  size?:      string;
  condition?: ProductCondition;
  maxPrice?:  number;
  sortBy?:    "price_asc" | "price_desc" | "newest";
}

// Razorpay window type augmentation
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface RazorpayOptions {
  key:         string;
  amount:      number;
  currency:    string;
  name:        string;
  description: string;
  order_id:    string;
  handler:     (response: RazorpayResponse) => void;
  prefill?: {
    name?:  string;
    email?: string;
    contact?: string;
  };
  theme?: { color: string };
}

export interface RazorpayResponse {
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  razorpay_signature:  string;
}

export interface RazorpayInstance {
  open: () => void;
  on:   (event: string, handler: () => void) => void;
}