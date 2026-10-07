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
 * EditorCanvas
 *
 * WORLD SPACE
 * -----------
 * Every product view has its own Fabric canvas whose dimensions match
 * the actual source image.
 *
 * VIEW SPACE
 * ----------
 * Fabric's viewportTransform handles:
 * - responsive fitting
 * - centering
 * - zoom
 * - pan
 *
 * These two coordinate systems are intentionally kept separate.
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
  deleteZoneRef?: React.RefObject<HTMLDivElement | null>;
  onDeleteTargetChange?: (isTarget: boolean) => void;
}

export interface EditorCanvasHandle {
  exportPNG: (viewId: string) => Promise<Blob | null>;
  addAccessoryToCanvas: (accessory: AccessoryForCanvas) => void;
  recenter: () => void;
}

const BOUNDED_TYPES: Record<string, { min: number; max: number }> = {
  dtf_sticker: { min: 0.6, max: 1.6 },
};

const MIN_ZOOM_MULT = 1;
const MAX_ZOOM_MULT = 4;

interface ContentBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

function touchDistance(e: TouchEvent): number {
  const [a, b] = [e.touches[0], e.touches[1]];

  return Math.hypot(
    b.clientX - a.clientX,
    b.clientY - a.clientY
  );
}

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

    return;
  }

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

/**
 * Attempts to find the visible garment inside the source image.
 *
 * Most BLAX SHEEP product photos have a light/white background.
 * We therefore detect pixels that are sufficiently different from
 * white.
 *
 * If detection fails, fitToContainer() simply falls back to the
 * full image bounds.
 */
function detectContentBounds(
  imageElement: HTMLImageElement,
  width: number,
  height: number
): ContentBounds | null {
  try {
    const sampleScale = Math.min(
      1,
      900 / Math.max(width, height)
    );

    const sampleWidth = Math.max(
      1,
      Math.floor(width * sampleScale)
    );

    const sampleHeight = Math.max(
      1,
      Math.floor(height * sampleScale)
    );

    const canvas = document.createElement("canvas");

    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!ctx) {
      return null;
    }

    ctx.drawImage(
      imageElement,
      0,
      0,
      sampleWidth,
      sampleHeight
    );

    const imageData = ctx.getImageData(
      0,
      0,
      sampleWidth,
      sampleHeight
    );

    const data = imageData.data;

    let minX = sampleWidth;
    let minY = sampleHeight;
    let maxX = -1;
    let maxY = -1;

    /*
     * We sample every 2 pixels.
     *
     * A pixel is considered part of the garment if:
     * - it isn't transparent
     * - it isn't almost pure white
     */
    const step = 2;

    for (let y = 0; y < sampleHeight; y += step) {
      for (let x = 0; x < sampleWidth; x += step) {
        const index =
          (y * sampleWidth + x) * 4;

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        if (a < 20) {
          continue;
        }

        const isAlmostWhite =
          r > 245 &&
          g > 245 &&
          b > 245;

        if (isAlmostWhite) {
          continue;
        }

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (
      maxX < 0 ||
      maxY < 0 ||
      minX >= maxX ||
      minY >= maxY
    ) {
      return null;
    }

    const scaleX = width / sampleWidth;
    const scaleY = height / sampleHeight;

    const left = minX * scaleX;
    const top = minY * scaleY;
    const right = (maxX + 1) * scaleX;
    const bottom = (maxY + 1) * scaleY;

    return {
      left,
      top,
      right,
      bottom,
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2,
    };
  } catch {
    /*
     * CORS/security restrictions can prevent pixel inspection.
     * In that case simply fall back to image center.
     */
    return null;
  }
}

export const EditorCanvas = forwardRef<
  EditorCanvasHandle,
  EditorCanvasProps
>(
  function EditorCanvas(
    {
      views,
      activeViewId,
      deleteZoneRef,
      onDeleteTargetChange,
    },
    ref
  ) {
    const containerRef =
      useRef<HTMLDivElement>(null);

    const canvasElRefs =
      useRef<Map<string, HTMLCanvasElement>>(
        new Map()
      );

    const fabricRefs =
      useRef<Map<string, any>>(new Map());

    const pxPerMmRefs =
      useRef<Map<string, number>>(new Map());

    const fitZoomRefs =
      useRef<Map<string, number>>(new Map());

    const contentBoundsRefs =
      useRef<Map<string, ContentBounds | null>>(
        new Map()
      );

    const initializingRefs =
      useRef<Set<string>>(new Set());

    const renderedPlacementIds =
      useRef<Set<string>>(new Set());

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

    const allAccessories = useQuery(
      api.accessories.listAccessories,
      {}
    );

    const accessoryLookup = useMemo(() => {
      const map =
        new Map<string, AccessoryForCanvas>();

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

    /*
     * ---------------------------------------------------------
     * FABRIC VIEW VISIBILITY
     * ---------------------------------------------------------
     *
     * Fabric creates:
     *
     * .canvas-container
     *   ├── lower canvas
     *   └── upper canvas
     *
     * Hiding the React <canvas> alone is therefore insufficient.
     *
     * We explicitly hide/show Fabric's wrapper instead.
     */
    const syncCanvasVisibility = useCallback(
      (activeId: string) => {
        fabricRefs.current.forEach(
          (fc, viewId) => {
            if (!fc?.wrapperEl) {
              return;
            }

            fc.wrapperEl.style.display =
              viewId === activeId
                ? "block"
                : "none";
          }
        );
      },
      []
    );

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

          const clientX =
            event?.clientX ??
            event?.touches?.[0]?.clientX;

          const clientY =
            event?.clientY ??
            event?.touches?.[0]?.clientY;

          if (
            typeof clientX !== "number" ||
            typeof clientY !== "number"
          ) {
            return false;
          }

          return (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
          );
        },
        [deleteZoneRef]
      );

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

          fc.remove(activeObject);
          fc.discardActiveObject();
          fc.requestRenderAll();

          removePlacement(placementId);

          renderedPlacementIds.current.delete(
            placementId
          );

          deleteTargetRef.current = false;

          onDeleteTargetChange?.(false);
        },
        [
          removePlacement,
          onDeleteTargetChange,
        ]
      );

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

    /*
     * ---------------------------------------------------------
     * FIT + CENTER
     * ---------------------------------------------------------
     */
    const fitToContainer =
      useCallback(
        (viewId: string) => {
          const fc =
            fabricRefs.current.get(viewId);

          const container =
            containerRef.current;

          if (!fc || !container) {
            return;
          }

          /*
           * Make sure this is the visible Fabric canvas.
           */
          syncCanvasVisibility(viewId);

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

          if (
            worldW <= 0 ||
            worldH <= 0
          ) {
            return;
          }

          /*
           * Small breathing room around the source image.
           */
          const paddingX =
            Math.min(32, cw * 0.06);

          const paddingY =
            Math.min(32, ch * 0.06);

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

          /*
           * Fit the WHOLE product image.
           */
          const zoom = Math.min(
            availableW / worldW,
            availableH / worldH
          );

          fitZoomRefs.current.set(
            viewId,
            zoom
          );

          /*
           * IMPORTANT:
           *
           * Instead of blindly centering the source image,
           * center the actual garment content.
           */
          const bounds =
            contentBoundsRefs.current.get(
              viewId
            );

          const garmentCenterX =
            bounds?.centerX ??
            worldW / 2;

          const garmentCenterY =
            bounds?.centerY ??
            worldH / 2;

          /*
           * We want:
           *
           * garmentCenterX * zoom + panX = containerCenterX
           *
           * garmentCenterY * zoom + panY = containerCenterY
           */
          const panX =
            cw / 2 -
            garmentCenterX * zoom;

          const panY =
            ch / 2 -
            garmentCenterY * zoom;

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
        [syncCanvasVisibility]
      );

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

    /*
     * ---------------------------------------------------------
     * INITIALIZE ONE VIEW
     * ---------------------------------------------------------
     */
    const initView =
      useCallback(
        async (view: EditorView) => {
          /*
           * Already initialized.
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

            const bgUrl =
              cld(
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

            const worldW =
              bgImg.width!;

            const worldH =
              bgImg.height!;

            /*
             * Detect the actual garment position
             * before creating the Fabric canvas.
             */
            let contentBounds:
              ContentBounds | null =
              null;

            const sourceElement =
              bgImg.getElement?.();

            if (
              sourceElement instanceof
              HTMLImageElement
            ) {
              contentBounds =
                detectContentBounds(
                  sourceElement,
                  worldW,
                  worldH
                );
            }

            contentBoundsRefs.current.set(
              view.viewId,
              contentBounds
            );

            const fc =
              new Canvas(el, {
                width: worldW,
                height: worldH,
                selection: true,
                preserveObjectStacking:
                  true,
                backgroundColor:
                  "#FFFFFF",
              });

            bgImg.set({
              left: 0,
              top: 0,
              selectable: false,
              evented: false,
              excludeFromExport: false,
            });

            fc.add(bgImg);
            fc.sendObjectToBack(bgImg);

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

            /*
             * -------------------------------------------------
             * PAN
             * -------------------------------------------------
             */
            let isPanning = false;

            let lastX = 0;
            let lastY = 0;

            fc.on(
              "mouse:down",
              (e: any) => {
                if (e.target) {
                  return;
                }

                isPanning = true;
                fc.selection = false;

                lastX =
                  e.e.clientX ??
                  e.e.touches?.[0]
                    ?.clientX ??
                  0;

                lastY =
                  e.e.clientY ??
                  e.e.touches?.[0]
                    ?.clientY ??
                  0;
              }
            );

            fc.on(
              "mouse:move",
              (e: any) => {
                if (!isPanning) {
                  return;
                }

                const clientX =
                  e.e.clientX ??
                  e.e.touches?.[0]
                    ?.clientX ??
                  0;

                const clientY =
                  e.e.clientY ??
                  e.e.touches?.[0]
                    ?.clientY ??
                  0;

                const vpt =
                  fc.viewportTransform;

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

            /*
             * -------------------------------------------------
             * WHEEL ZOOM
             * -------------------------------------------------
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

            /*
             * -------------------------------------------------
             * PINCH ZOOM
             * -------------------------------------------------
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
              { passive: true }
            );

            el.addEventListener(
              "touchmove",
              (e: TouchEvent) => {
                if (
                  e.touches.length !== 2 ||
                  pinchStartDist <= 0
                ) {
                  return;
                }

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
                  (
                    e.touches[0]
                      .clientX +
                    e.touches[1]
                      .clientX
                  ) /
                    2 -
                  rect.left;

                const midY =
                  (
                    e.touches[0]
                      .clientY +
                    e.touches[1]
                      .clientY
                  ) /
                    2 -
                  rect.top;

                fc.zoomToPoint(
                  new Point(
                    midX,
                    midY
                  ),
                  zoom
                );
              },
              { passive: true }
            );

            /*
             * -------------------------------------------------
             * DELETE TARGET
             * -------------------------------------------------
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

            /*
             * -------------------------------------------------
             * SAVE OBJECT TRANSFORM
             * -------------------------------------------------
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

            /*
             * -------------------------------------------------
             * DROP TO DELETE
             * -------------------------------------------------
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

                deleteTargetRef.current =
                  false;

                onDeleteTargetChange?.(
                  false
                );
              }
            );

            /*
             * -------------------------------------------------
             * SCALE BOUNDS
             * -------------------------------------------------
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

                const w =
                  (obj.width ?? 0) *
                  obj.scaleX;

                const h =
                  (obj.height ?? 0) *
                  obj.scaleY;

                if (
                  w < bounds.minW
                ) {
                  obj.scaleX =
                    bounds.minW /
                    obj.width;
                }

                if (
                  w > bounds.maxW
                ) {
                  obj.scaleX =
                    bounds.maxW /
                    obj.width;
                }

                if (
                  h < bounds.minH
                ) {
                  obj.scaleY =
                    bounds.minH /
                    obj.height;
                }

                if (
                  h > bounds.maxH
                ) {
                  obj.scaleY =
                    bounds.maxH /
                    obj.height;
                }
              }
            );

            fabricRefs.current.set(
              view.viewId,
              fc
            );

            fc.renderAll();

            setReadyViewIds(
              (prev) => {
                const next =
                  new Set(prev);

                next.add(
                  view.viewId
                );

                return next;
              }
            );

            /*
             * The newly-created Fabric wrapper
             * must be explicitly shown/hidden.
             */
            syncCanvasVisibility(
              activeViewId
            );

            /*
             * Wait for the browser to finish
             * laying out the canvas before fitting.
             */
            requestAnimationFrame(() => {
              if (
                activeViewId ===
                view.viewId
              ) {
                fitToContainer(
                  view.viewId
                );
              }
            });
          } finally {
            initializingRefs.current.delete(
              view.viewId
            );
          }
        },
        [
          activeViewId,
          fitToContainer,
          isPointerInsideDeleteZone,
          onDeleteTargetChange,
          deleteSelectedAccessory,
          syncCanvasVisibility,
          updatePlacement,
        ]
      );

    /*
     * ---------------------------------------------------------
     * ACTIVE VIEW INITIALIZATION
     * ---------------------------------------------------------
     */
    useEffect(() => {
      const view =
        views.find(
          (v) =>
            v.viewId ===
            activeViewId
        );

      if (!view) {
        return;
      }

      /*
       * Immediately hide old Fabric canvases.
       */
      syncCanvasVisibility(
        activeViewId
      );

      /*
       * Initialize the new view if necessary.
       */
      initView(view).then(() => {
        syncCanvasVisibility(
          activeViewId
        );

        requestAnimationFrame(() => {
          fitToContainer(
            activeViewId
          );
        });
      });
    }, [
      activeViewId,
      views,
      initView,
      syncCanvasVisibility,
      fitToContainer,
    ]);

    /*
     * ---------------------------------------------------------
     * RESPONSIVE REFIT
     * ---------------------------------------------------------
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

      return () => {
        ro.disconnect();
      };
    }, [
      activeViewId,
      fitToContainer,
    ]);

    /*
     * ---------------------------------------------------------
     * RESTORE PLACEMENTS
     * ---------------------------------------------------------
     */
    useEffect(() => {
      async function renderPlacements() {
        const {
          FabricImage,
        } = await import("fabric");

        for (
          const placement of placements
        ) {
          if (
            renderedPlacementIds.current.has(
              placement.placementId
            )
          ) {
            continue;
          }

          const fc =
            fabricRefs.current.get(
              placement.viewId
            );

          if (!fc) {
            continue;
          }

          const accessory =
            accessoryLookup.get(
              placement.accessoryId
            );

          if (!accessory) {
            continue;
          }

          const pxPerMm =
            pxPerMmRefs.current.get(
              placement.viewId
            ) || 1;

          const img =
            await FabricImage.fromURL(
              accessory.cutoutUrl,
              {
                crossOrigin:
                  "anonymous",
              }
            );

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
          fc.renderAll();

          renderedPlacementIds.current.add(
            placement.placementId
          );
        }
      }

      renderPlacements();
    }, [
      placements,
      readyViewIds,
      accessoryLookup,
    ]);

    /*
     * ---------------------------------------------------------
     * ADD ACCESSORY
     * ---------------------------------------------------------
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
            const worldW =
              fc.getWidth();

            scaleX =
              scaleY =
                (worldW * 0.2) /
                img.width!;
          }

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

          const placementId =
            globalThis.crypto?.randomUUID?.() ??
            `p_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2)}`;

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

          fc.add(img);
          fc.setActiveObject(img);
          fc.renderAll();

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

          renderedPlacementIds.current.add(
            placementId
          );
        },
        [
          activeViewId,
          addPlacement,
        ]
      );

    /*
     * ---------------------------------------------------------
     * EXPORT
     * ---------------------------------------------------------
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

          const prevVpt =
            fc.viewportTransform;

          fc.setViewportTransform([
            1,
            0,
            0,
            1,
            0,
            0,
          ]);

          fc.renderAll();

          const dataUrl =
            fc.toDataURL({
              format: "jpeg",
              quality: 0.85,
              multiplier: 1,
            });

          fc.setViewportTransform(
            prevVpt
          );

          fc.renderAll();

          return fetch(dataUrl)
            .then((r) =>
              r.blob()
            )
            .catch(() => null);
        },
        []
      );

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
          />
        ))}

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
  }
);