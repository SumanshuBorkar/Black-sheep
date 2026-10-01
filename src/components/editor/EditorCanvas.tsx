"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useQuery } from "convex/react";
import { RefreshCw } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useEditorStore } from "../../store/editorStore";
import { cld } from "@/lib/cloudinary";
import { computePxPerMm, mmToPx, pxToMm } from "@/lib/utils";

/**
 * EditorCanvas — the Fabric.js drawing surface, in WORLD SPACE.
 *
 * Plain English — the core idea:
 *
 * There are two coordinate systems at play, and they must never mix:
 *
 * 1. WORLD SPACE
 *    One Fabric canvas per garment "view" (front/back/left/right/top/...),
 *    sized to exactly match that view's photo in pixels.
 *
 *    Objects placed on it are scaled using that photo's own
 *    pixels-per-millimetre.
 *
 *    Position is stored in millimetres from the view's origin.
 *
 * 2. VIEW SPACE
 *    A zoom/pan (Fabric viewport transform) applied on top.
 *
 *    This purely fits the world canvas into whatever container size
 *    the device gives us.
 *
 *    Zooming or panning NEVER changes an object's actual
 *    left/top/scaleX/scaleY — only how much of the world is visible.
 *
 * This separation makes the editor both size-accurate and responsive.
 *
 * Each view's Fabric canvas is created lazily and then kept alive
 * when switching between view tabs.
 */

export interface EditorView {
  viewId: string;
  slug: string;
  label: string;
  publicId: string;
  maxWidthMm?: number;
  maxHeightMm?: number;
}

export interface AccessoryForCanvas {
  id: string;
  cutoutUrl: string;
  widthMm: number;
  heightMm: number;
  type: string;
}

interface EditorCanvasProps {
  views: EditorView[];
  activeViewId: string;

  /**
   * Bottom delete drop-zone supplied by EditorShell.
   *
   * The canvas uses this to determine whether the currently
   * dragged accessory is being released over the delete zone.
   */
  deleteZoneRef?: React.RefObject<HTMLDivElement | null>;

  /**
   * Lets EditorShell highlight the delete zone while an accessory
   * is being dragged over it.
   */
  onDeleteTargetChange?: (isTarget: boolean) => void;
}

export interface EditorCanvasHandle {
  exportPNG: (viewId: string) => Promise<Blob | null>;
  addAccessoryToCanvas: (accessory: AccessoryForCanvas) => void;
  recenter: () => void;
}

/**
 * Accessory types the customer may resize.
 *
 * Everything NOT listed here is locked to its true physical size.
 */
const BOUNDED_TYPES: Record<string, { min: number; max: number }> = {
  dtf_sticker: { min: 0.6, max: 1.6 },
};

const MIN_ZOOM_MULT = 1;
const MAX_ZOOM_MULT = 4;

/**
 * Fabric objects can contain custom runtime properties such as:
 *
 * - placementId
 * - accessoryId
 * - __sizeBoundsPx
 *
 * Fabric's TypeScript definitions don't know about those properties.
 *
 * Instead of accessing object.placementId directly everywhere,
 * use this small safe helper.
 */
function getPlacementId(object: unknown): string | undefined {
  if (!object || typeof object !== "object") {
    return undefined;
  }

  if (
    "placementId" in object &&
    typeof object.placementId === "string"
  ) {
    return object.placementId;
  }

  return undefined;
}

/**
 * Extract browser client coordinates from Fabric's native event.
 *
 * Supports mouse/pointer events and touch events.
 */
function getClientPoint(event: any): {
  clientX: number;
  clientY: number;
} | null {
  if (!event) return null;

  const clientX =
    typeof event.clientX === "number"
      ? event.clientX
      : event.touches?.[0]?.clientX;

  const clientY =
    typeof event.clientY === "number"
      ? event.clientY
      : event.touches?.[0]?.clientY;

  if (
    typeof clientX !== "number" ||
    typeof clientY !== "number"
  ) {
    return null;
  }

  return {
    clientX,
    clientY,
  };
}

function touchDistance(e: TouchEvent): number {
  const [a, b] = [e.touches[0], e.touches[1]];

  return Math.hypot(
    b.clientX - a.clientX,
    b.clientY - a.clientY
  );
}

/**
 * Apply physical-size rules to an accessory.
 *
 * Locked accessories:
 * - Move
 * - Rotate
 * - Cannot resize
 *
 * Bounded accessories:
 * - Move
 * - Rotate
 * - Resize within min/max percentage of nominal size
 */
function applyLockOrBounds(
  img: any,
  accessoryType: string | undefined,
  pxPerMm: number,
  accessory?: AccessoryForCanvas
) {
  const bounds = accessoryType
    ? BOUNDED_TYPES[accessoryType]
    : undefined;

  if (!bounds) {
    // Locked: true-to-life size only.
    img.set({
      lockScalingX: true,
      lockScalingY: true,
    });

    img.setControlsVisibility({
      ml: false,
      mr: false,
      mt: false,
      mb: false,
      tl: false,
      tr: false,
      bl: false,
      br: false,
      mtr: true,
    });
  } else {
    // Bounded accessories such as DTF stickers.
    img.set({
      lockScalingFlip: true,
    });

    img.setControlsVisibility({
      ml: false,
      mr: false,
      mt: false,
      mb: false,
      tl: false,
      tr: true,
      bl: false,
      br: true,
      mtr: true,
    });

    if (accessory && pxPerMm) {
      const nominalWpx = mmToPx(
        accessory.widthMm,
        pxPerMm
      );

      const nominalHpx = mmToPx(
        accessory.heightMm,
        pxPerMm
      );

      img.__sizeBoundsPx = {
        minW: nominalWpx * bounds.min,
        maxW: nominalWpx * bounds.max,
        minH: nominalHpx * bounds.min,
        maxH: nominalHpx * bounds.max,
      };
    }
  }
}

export const EditorCanvas = forwardRef<
  EditorCanvasHandle,
  EditorCanvasProps
>(function EditorCanvas(
  {
    views,
    activeViewId,
    deleteZoneRef,
    onDeleteTargetChange,
  },
  ref
) {
  /**
   * The actual visible editor viewport.
   */
  const containerRef =
    useRef<HTMLDivElement>(null);

  /**
   * One HTML canvas element per view.
   */
  const canvasElRefs = useRef<
    Map<string, HTMLCanvasElement>
  >(new Map());

  /**
   * One Fabric Canvas instance per view.
   */
  const fabricRefs = useRef<
    Map<string, any>
  >(new Map());

  /**
   * px-per-mm calibration for each view.
   */
  const pxPerMmRefs = useRef<
    Map<string, number>
  >(new Map());

  /**
   * Fit zoom for each view.
   *
   * Used to clamp manual zoom between:
   *
   * 1x fit zoom
   * and
   * 4x fit zoom
   */
  const fitZoomRefs = useRef<
    Map<string, number>
  >(new Map());

  /**
   * Prevents duplicate initialization.
   */
  const initializingRefs = useRef<
    Set<string>
  >(new Set());

  /**
   * Tracks which placements have already been
   * rendered into Fabric.
   */
  const renderedPlacementIds = useRef<
    Set<string>
  >(new Set());

  /**
   * Current delete-zone hover state.
   */
  const deleteTargetRef =
    useRef(false);

  const [readyViewIds, setReadyViewIds] =
    useState<Set<string>>(new Set());

  const {
    placements,
    addPlacement,
    updatePlacement,
    removePlacement,
  } = useEditorStore();

  /**
   * Accessory catalogue lookup.
   *
   * Used when restoring saved placements because a placement
   * only stores accessoryId.
   */
  const allAccessories = useQuery(
    api.accessories.listAccessories,
    {}
  );

  const accessoryLookup = useMemo(() => {
    const map = new Map<
      string,
      AccessoryForCanvas
    >();

    for (const acc of allAccessories ?? []) {
      map.set(acc._id, {
        id: acc._id,
        cutoutUrl: acc.cutoutUrl,
        widthMm: acc.widthMm,
        heightMm: acc.heightMm,
        type: acc.type,
      });
    }

    return map;
  }, [allAccessories]);

  /**
   * Returns true when the browser pointer is currently
   * inside the footer delete zone.
   */
  const isPointerInsideDeleteZone =
    useCallback(
      (event: any) => {
        const zone =
          deleteZoneRef?.current;

        if (!zone) {
          return false;
        }

        const rect =
          zone.getBoundingClientRect();

        const point =
          getClientPoint(event);

        if (!point) {
          return false;
        }

        return (
          point.clientX >= rect.left &&
          point.clientX <= rect.right &&
          point.clientY >= rect.top &&
          point.clientY <= rect.bottom
        );
      },
      [deleteZoneRef]
    );

  /**
   * Deletes the currently selected Fabric object
   * and its corresponding Zustand placement.
   */
  const deleteSelectedAccessory =
    useCallback(
      (fc: any) => {
        const activeObject =
          fc.getActiveObject();

        const placementId =
          getPlacementId(activeObject);

        if (!placementId) {
          return;
        }

        /**
         * Remove from Fabric first.
         */
        fc.remove(activeObject);

        fc.discardActiveObject();

        fc.requestRenderAll();

        /**
         * Remove from application state.
         */
        removePlacement(placementId);

        /**
         * Prevent the renderer from bringing
         * the deleted placement back.
         */
        renderedPlacementIds.current.delete(
          placementId
        );

        /**
         * Reset delete-zone visual state.
         */
        deleteTargetRef.current = false;

        onDeleteTargetChange?.(false);
      },
      [
        removePlacement,
        onDeleteTargetChange,
      ]
    );

  /**
   * React ref callback for each canvas element.
   */
  const setCanvasElRef =
    useCallback(
      (viewId: string) =>
        (el: HTMLCanvasElement | null) => {
          if (el) {
            canvasElRefs.current.set(
              viewId,
              el
            );
          }
        },
      []
    );

  /**
   * Fit the world-space Fabric canvas inside
   * the available viewport.
   *
   * IMPORTANT:
   *
   * This changes ONLY the viewport transform.
   *
   * It does NOT change:
   * - object left/top
   * - object scale
   * - object dimensions
   * - mm measurements
   */
  const fitToContainer =
    useCallback(
      (viewId: string) => {
        const fc =
          fabricRefs.current.get(
            viewId
          );

        const container =
          containerRef.current;

        if (!fc || !container) {
          return;
        }

        const cw =
          container.clientWidth;

        const ch =
          container.clientHeight;

        if (cw <= 0 || ch <= 0) {
          return;
        }

        const worldW =
          fc.getWidth();

        const worldH =
          fc.getHeight();

        if (worldW <= 0 || worldH <= 0) {
          return;
        }

        /**
         * Breathing room around the garment.
         */
        const paddingX = Math.min(
          32,
          cw * 0.06
        );

        const paddingY = Math.min(
          32,
          ch * 0.06
        );

        const availableW =
          Math.max(
            1,
            cw - paddingX * 2
          );

        const availableH =
          Math.max(
            1,
            ch - paddingY * 2
          );

        /**
         * Fit the complete garment.
         */
        const zoom = Math.min(
          availableW / worldW,
          availableH / worldH
        );

        fitZoomRefs.current.set(
          viewId,
          zoom
        );

        const renderedW =
          worldW * zoom;

        const renderedH =
          worldH * zoom;

        /**
         * Centre the world-space canvas.
         */
        const panX =
          (cw - renderedW) / 2;

        const panY =
          (ch - renderedH) / 2;

        fc.setViewportTransform([
          zoom,
          0,
          0,
          zoom,
          panX,
          panY,
        ]);

        fc.renderAll();
      },
      []
    );

  /**
   * Re-centre the currently active view.
   */
  const recenter =
    useCallback(() => {
      if (activeViewId) {
        fitToContainer(
          activeViewId
        );
      }
    }, [
      activeViewId,
      fitToContainer,
    ]);

  /**
   * Initialise one Fabric canvas.
   *
   * Each view gets its own world-space canvas.
   */
  const initView =
    useCallback(
      async (view: EditorView) => {
        /**
         * Already initialized or currently initializing.
         */
        if (
          fabricRefs.current.has(
            view.viewId
          ) ||
          initializingRefs.current.has(
            view.viewId
          )
        ) {
          return;
        }

        const el =
          canvasElRefs.current.get(
            view.viewId
          );

        if (!el) {
          return;
        }

        initializingRefs.current.add(
          view.viewId
        );

        try {
          const {
            Canvas,
            FabricImage,
            Point,
          } = await import("fabric");

          /**
           * Load garment image.
           */
          const bgUrl = cld(
            view.publicId,
            "full"
          );

          const bgImg =
            await FabricImage.fromURL(
              bgUrl,
              {
                crossOrigin:
                  "anonymous",
              }
            );

          /**
           * WORLD SPACE.
           *
           * The Fabric canvas exactly matches
           * the source garment image dimensions.
           */
          const worldW =
            bgImg.width!;

          const worldH =
            bgImg.height!;

          const fc = new Canvas(el, {
            width: worldW,
            height: worldH,
            selection: true,
            preserveObjectStacking: true,
            backgroundColor:
              "#FFFFFF",
          });

          /**
           * Garment background.
           */
          bgImg.set({
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
            excludeFromExport: false,
          });

          fc.add(bgImg);

          fc.sendObjectToBack(bgImg);

          /**
           * Calculate physical scale.
           */
          const calibration =
            computePxPerMm(
              worldW,
              worldH,
              view.maxWidthMm,
              view.maxHeightMm
            );

          pxPerMmRefs.current.set(
            view.viewId,
            calibration?.avg ?? 0
          );

          /**
           * ───────────────────────────────
           * Empty-canvas panning
           * ───────────────────────────────
           */
          let isPanning = false;

          let lastX = 0;
          let lastY = 0;

          fc.on(
            "mouse:down",
            (e: any) => {
              /**
               * If an object was clicked,
               * Fabric handles the interaction.
               */
              if (e.target) {
                return;
              }

              isPanning = true;

              fc.selection = false;

              const point =
                getClientPoint(e.e);

              lastX =
                point?.clientX ?? 0;

              lastY =
                point?.clientY ?? 0;
            }
          );

          fc.on(
            "mouse:move",
            (e: any) => {
              if (!isPanning) {
                return;
              }

              const point =
                getClientPoint(e.e);

              if (!point) {
                return;
              }

              const clientX =
                point.clientX;

              const clientY =
                point.clientY;

              const vpt =
                fc.viewportTransform;

              if (!vpt) {
                return;
              }

              vpt[4] +=
                clientX - lastX;

              vpt[5] +=
                clientY - lastY;

              fc.setViewportTransform(
                vpt
              );

              lastX = clientX;
              lastY = clientY;

              fc.requestRenderAll();
            }
          );

          fc.on(
            "mouse:up",
            () => {
              isPanning = false;

              fc.selection = true;
            }
          );

          /**
           * ───────────────────────────────
           * Mouse wheel / trackpad zoom
           * ───────────────────────────────
           */
          fc.on(
            "mouse:wheel",
            (opt: any) => {
              const delta =
                opt.e.deltaY;

              let zoom =
                fc.getZoom() *
                0.999 ** delta;

              const fitZoom =
                fitZoomRefs.current.get(
                  view.viewId
                ) ?? zoom;

              zoom = Math.max(
                fitZoom *
                  MIN_ZOOM_MULT,
                Math.min(
                  fitZoom *
                    MAX_ZOOM_MULT,
                  zoom
                )
              );

              fc.zoomToPoint(
                new Point(
                  opt.e.offsetX,
                  opt.e.offsetY
                ),
                zoom
              );

              opt.e.preventDefault();

              opt.e.stopPropagation();
            }
          );

          /**
           * ───────────────────────────────
           * Two-finger pinch-to-zoom
           * ───────────────────────────────
           */
          let pinchStartDist = 0;

          let pinchStartZoom = 1;

          el.addEventListener(
            "touchstart",
            (e: TouchEvent) => {
              if (
                e.touches.length === 2
              ) {
                pinchStartDist =
                  touchDistance(e);

                pinchStartZoom =
                  fc.getZoom();
              }
            },
            {
              passive: true,
            }
          );

          el.addEventListener(
            "touchmove",
            (e: TouchEvent) => {
              if (
                e.touches.length === 2 &&
                pinchStartDist > 0
              ) {
                const dist =
                  touchDistance(e);

                const fitZoom =
                  fitZoomRefs.current.get(
                    view.viewId
                  ) ?? 1;

                let zoom =
                  pinchStartZoom *
                  (dist /
                    pinchStartDist);

                zoom = Math.max(
                  fitZoom *
                    MIN_ZOOM_MULT,
                  Math.min(
                    fitZoom *
                      MAX_ZOOM_MULT,
                    zoom
                  )
                );

                const rect =
                  el.getBoundingClientRect();

                const midX =
                  (e.touches[0]
                    .clientX +
                    e.touches[1]
                      .clientX) /
                    2 -
                  rect.left;

                const midY =
                  (e.touches[0]
                    .clientY +
                    e.touches[1]
                      .clientY) /
                    2 -
                  rect.top;

                fc.zoomToPoint(
                  new Point(
                    midX,
                    midY
                  ),
                  zoom
                );

                fc.requestRenderAll();
              }
            },
            {
              passive: true,
            }
          );

          /**
           * ───────────────────────────────
           * Accessory moving
           * ───────────────────────────────
           *
           * While dragging an accessory:
           *
           * 1. Detect whether pointer is over Delete.
           * 2. Tell EditorShell to highlight Delete.
           */
          fc.on(
            "object:moving",
            (e: any) => {
              const obj =
                e.target;

              const placementId =
                getPlacementId(obj);

              if (!placementId) {
                return;
              }

              const insideDeleteZone =
                isPointerInsideDeleteZone(
                  e.e
                );

              if (
                insideDeleteZone !==
                deleteTargetRef.current
              ) {
                deleteTargetRef.current =
                  insideDeleteZone;

                onDeleteTargetChange?.(
                  insideDeleteZone
                );
              }
            }
          );

          /**
           * ───────────────────────────────
           * Save position/rotation/scale
           * ───────────────────────────────
           *
           * Fabric works in pixels.
           *
           * Zustand stores positions in mm.
           */
          fc.on(
            "object:modified",
            (e: any) => {
              const obj =
                e.target;

              const placementId =
                getPlacementId(obj);

              if (!placementId) {
                return;
              }

              const pxPerMm =
                pxPerMmRefs.current.get(
                  view.viewId
                ) || 1;

              updatePlacement(
                placementId,
                {
                  xMm: pxToMm(
                    obj.left!,
                    pxPerMm
                  ),

                  yMm: pxToMm(
                    obj.top!,
                    pxPerMm
                  ),

                  rotation:
                    obj.angle ?? 0,

                  scaleX:
                    obj.scaleX ?? 1,

                  scaleY:
                    obj.scaleY ?? 1,
                }
              );
            }
          );

          /**
           * ───────────────────────────────
           * Release accessory
           * ───────────────────────────────
           *
           * If released over Delete,
           * remove it from both Fabric and Zustand.
           */
          fc.on(
            "mouse:up",
            (e: any) => {
              const activeObject =
                fc.getActiveObject();

              const placementId =
                getPlacementId(
                  activeObject
                );

              /**
               * Nothing selected.
               */
              if (!placementId) {
                deleteTargetRef.current =
                  false;

                onDeleteTargetChange?.(
                  false
                );

                return;
              }

              const shouldDelete =
                isPointerInsideDeleteZone(
                  e.e
                );

              if (shouldDelete) {
                deleteSelectedAccessory(
                  fc
                );

                return;
              }

              /**
               * Normal release.
               */
              deleteTargetRef.current =
                false;

              onDeleteTargetChange?.(
                false
              );
            }
          );

          /**
           * ───────────────────────────────
           * Bounded accessory scaling
           * ───────────────────────────────
           *
           * Example:
           * DTF stickers may resize between
           * 60% and 160% of their nominal size.
           */
          fc.on(
            "object:scaling",
            (e: any) => {
              const obj =
                e.target;

              const bounds =
                obj?.__sizeBoundsPx;

              if (!bounds) {
                return;
              }

              const width =
                (obj.width ?? 0) *
                (obj.scaleX ?? 1);

              const height =
                (obj.height ?? 0) *
                (obj.scaleY ?? 1);

              if (
                width < bounds.minW &&
                obj.width
              ) {
                obj.scaleX =
                  bounds.minW /
                  obj.width;
              }

              if (
                width > bounds.maxW &&
                obj.width
              ) {
                obj.scaleX =
                  bounds.maxW /
                  obj.width;
              }

              if (
                height < bounds.minH &&
                obj.height
              ) {
                obj.scaleY =
                  bounds.minH /
                  obj.height;
              }

              if (
                height > bounds.maxH &&
                obj.height
              ) {
                obj.scaleY =
                  bounds.maxH /
                  obj.height;
              }
            }
          );

          /**
           * Store Fabric canvas.
           */
          fabricRefs.current.set(
            view.viewId,
            fc
          );

          fc.renderAll();

          /**
           * Tell React this view is ready.
           */
          setReadyViewIds(
            (prev) =>
              new Set([
                ...prev,
                view.viewId,
              ])
          );

          /**
           * Fit after the browser has completed layout.
           */
          requestAnimationFrame(() => {
            fitToContainer(
              view.viewId
            );
          });
        } catch (error) {
          console.error(
            `Failed to initialize editor view ${view.viewId}:`,
            error
          );
        } finally {
          initializingRefs.current.delete(
            view.viewId
          );
        }
      },
      [
        fitToContainer,
        updatePlacement,
        isPointerInsideDeleteZone,
        deleteSelectedAccessory,
        onDeleteTargetChange,
      ]
    );

  /**
   * Initialise the active view's canvas
   * once its <canvas> element exists.
   */
  useEffect(() => {
    const view = views.find(
      (v) =>
        v.viewId === activeViewId
    );

    if (view) {
      void initView(view);
    }
  }, [
    activeViewId,
    views,
    initView,
  ]);

  /**
   * Re-fit the active canvas whenever
   * the editor container changes size.
   *
   * This handles:
   *
   * - Browser resize
   * - Mobile rotation
   * - Footer/header size changes
   * - Desktop window resize
   */
  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const ro =
      new ResizeObserver(() => {
        if (activeViewId) {
          fitToContainer(
            activeViewId
          );
        }
      });

    ro.observe(container);

    return () =>
      ro.disconnect();
  }, [
    activeViewId,
    fitToContainer,
  ]);

  /**
   * Render placements that exist in Zustand
   * but haven't been rendered into Fabric yet.
   *
   * This handles:
   *
   * - Existing saved designs
   * - Switching views
   * - Delayed accessory catalogue loading
   */
  useEffect(() => {
    let cancelled = false;

    async function renderPlacements() {
      const {
        FabricImage,
      } = await import("fabric");

      if (cancelled) {
        return;
      }

      for (const placement of placements) {
        if (
          renderedPlacementIds.current.has(
            placement.placementId
          )
        ) {
          continue;
        }

        const viewId =
          placement.viewId as unknown as string;

        const fc =
          fabricRefs.current.get(
            viewId
          );

        if (!fc) {
          continue;
        }

        const accessory =
          accessoryLookup.get(
            placement.accessoryId as unknown as string
          );

        if (!accessory) {
          continue;
        }

        const pxPerMm =
          pxPerMmRefs.current.get(
            viewId
          ) || 1;

        try {
          const img =
            await FabricImage.fromURL(
              accessory.cutoutUrl,
              {
                crossOrigin:
                  "anonymous",
              }
            );

          if (cancelled) {
            return;
          }

          /**
           * It is possible the placement was removed
           * while its image was loading.
           *
           * Don't put it back onto the canvas.
           */
          const stillExists =
            placements.some(
              (item) =>
                item.placementId ===
                placement.placementId
            );

          if (!stillExists) {
            continue;
          }

          img.set({
            left: mmToPx(
              placement.xMm,
              pxPerMm
            ),

            top: mmToPx(
              placement.yMm,
              pxPerMm
            ),

            angle:
              placement.rotation,

            scaleX:
              placement.scaleX,

            scaleY:
              placement.scaleY,

            cornerStyle:
              "circle",

            cornerColor:
              "#F7FD04",

            borderColor:
              "#0A0A0A",

            cornerSize: 10,

            transparentCorners:
              false,

            /**
             * Custom Fabric runtime properties.
             *
             * The `as any` is intentional here because
             * Fabric does not declare these custom fields.
             */
            placementId:
              placement.placementId,

            accessoryId:
              placement.accessoryId,
          } as any);

          applyLockOrBounds(
            img,
            accessory.type,
            pxPerMm,
            accessory
          );

          fc.add(img);

          /**
           * Restore stacking order.
           *
           * Background is object 0, so accessories
           * are added above it.
           */
          fc.renderAll();

          renderedPlacementIds.current.add(
            placement.placementId
          );
        } catch (error) {
          console.error(
            "Failed to restore accessory placement:",
            error
          );
        }
      }
    }

    void renderPlacements();

    return () => {
      cancelled = true;
    };
  }, [
    placements,
    readyViewIds,
    accessoryLookup,
  ]);

  /**
   * ─────────────────────────────────────
   * Add a NEW accessory
   * ─────────────────────────────────────
   */
  const addAccessoryToCanvas =
    useCallback(
      async (
        accessory: AccessoryForCanvas
      ) => {
        const {
          FabricImage,
        } = await import("fabric");

        const fc =
          fabricRefs.current.get(
            activeViewId
          );

        if (!fc) {
          return;
        }

        const pxPerMm =
          pxPerMmRefs.current.get(
            activeViewId
          );

        const img =
          await FabricImage.fromURL(
            accessory.cutoutUrl,
            {
              crossOrigin:
                "anonymous",
            }
          );

        let scaleX: number;
        let scaleY: number;

        if (pxPerMm) {
          /**
           * True-to-life physical size.
           */
          scaleX =
            mmToPx(
              accessory.widthMm,
              pxPerMm
            ) /
            img.width!;

          scaleY =
            mmToPx(
              accessory.heightMm,
              pxPerMm
            ) /
            img.height!;
        } else {
          /**
           * Legacy/unmeasured view fallback.
           */
          const worldW =
            fc.getWidth();

          scaleX =
            (worldW * 0.2) /
            img.width!;

          scaleY = scaleX;
        }

        /**
         * Centre accessory in world space.
         */
        const left =
          fc.getWidth() / 2 -
          (img.width! *
            scaleX) /
            2;

        const top =
          fc.getHeight() / 2 -
          (img.height! *
            scaleY) /
            2;

        /**
         * Generate unique placement ID.
         */
        const placementId =
          globalThis.crypto
            ?.randomUUID?.() ??
          `p_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}`;

        /**
         * Add custom runtime properties.
         *
         * `as any` is intentional because these
         * properties belong to our editor, not Fabric.
         */
        img.set({
          left,
          top,
          scaleX,
          scaleY,

          placementId,

          accessoryId:
            accessory.id,
        } as any);

        applyLockOrBounds(
          img,
          accessory.type,
          pxPerMm ?? 1,
          accessory
        );

        /**
         * Add to Fabric.
         */
        fc.add(img);

        fc.setActiveObject(img);

        fc.renderAll();

        /**
         * Add to Zustand.
         */
        addPlacement({
          placementId,

          accessoryId:
            accessory.id as any,

          viewId:
            activeViewId as any,

          xMm: pxPerMm
            ? pxToMm(
                left,
                pxPerMm
              )
            : 0,

          yMm: pxPerMm
            ? pxToMm(
                top,
                pxPerMm
              )
            : 0,

          rotation: 0,

          scaleX,

          scaleY,

          zIndex:
            fc.getObjects()
              .length,
        });

        /**
         * Mark as already rendered.
         */
        renderedPlacementIds.current.add(
          placementId
        );
      },
      [
        activeViewId,
        addPlacement,
      ]
    );

  /**
   * ─────────────────────────────────────
   * Export view
   * ─────────────────────────────────────
   *
   * Export ignores current zoom/pan.
   *
   * It exports the actual world-space canvas.
   */
  const exportPNG =
    useCallback(
      async (
        viewId: string
      ): Promise<Blob | null> => {
        const fc =
          fabricRefs.current.get(
            viewId
          );

        if (!fc) {
          return null;
        }

        /**
         * Preserve current viewport.
         */
        const prevVpt =
          fc.viewportTransform;

        /**
         * Reset to world-space 1:1.
         */
        fc.setViewportTransform([
          1,
          0,
          0,
          1,
          0,
          0,
        ]);

        fc.renderAll();

        /**
         * Export.
         *
         * NOTE:
         * Despite the existing function name `exportPNG`,
         * your current implementation exports JPEG.
         * This is intentionally preserved so the rest of
         * your EditorShell does not need to change.
         */
        const dataUrl =
          fc.toDataURL({
            format: "jpeg",
            quality: 0.85,
            multiplier: 1,
          });

        /**
         * Restore viewport.
         */
        fc.setViewportTransform(
          prevVpt
        );

        fc.renderAll();

        return fetch(dataUrl)
          .then((response) =>
            response.blob()
          )
          .catch(() => null);
      },
      []
    );

  /**
   * Expose imperative methods to EditorShell.
   */
  useImperativeHandle(
    ref,
    () => ({
      exportPNG,
      addAccessoryToCanvas,
      recenter,
    }),
    [
      exportPNG,
      addAccessoryToCanvas,
      recenter,
    ]
  );

  /**
   * ─────────────────────────────────────
   * Render
   * ─────────────────────────────────────
   *
   * IMPORTANT:
   *
   * `w-full h-full` is intentional.
   *
   * EditorShell owns the overall 100dvh layout.
   * EditorCanvas simply fills the middle area.
   */
  return (
    <div
      ref={containerRef}
      className="
        relative
        w-full
        h-full
        min-h-0
        min-w-0
        bg-white
        overflow-hidden
        touch-none
      "
    >
      {views.map((view) => (
        <canvas
          key={view.viewId}
          ref={setCanvasElRef(
            view.viewId
          )}
          className="
            absolute
            left-0
            top-0
            block
          "
          style={{
            display:
              activeViewId ===
              view.viewId
                ? "block"
                : "none",
          }}
        />
      ))}

      {/* Re-centre button */}
      <button
        type="button"
        onClick={recenter}
        aria-label="Re-centre"
        className="
          absolute
          bottom-3
          right-3
          sm:bottom-4
          sm:right-4
          z-20
          w-10
          h-10
          flex
          items-center
          justify-center
          bg-white
          border
          border-black
          rounded-full
          shadow-sm
          active:scale-95
          transition-transform
        "
      >
        <RefreshCw
          size={18}
          strokeWidth={2}
        />
      </button>
    </div>
  );
});