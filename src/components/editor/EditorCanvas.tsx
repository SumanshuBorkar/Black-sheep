"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { useEditorStore } from "../../store/editorStore";
import { cld } from "@/lib/cloudinary";
import { toPercent, fromPercent } from "@/lib/utils";

/**
 * EditorCanvas — the Fabric.js drawing surface
 *
 * Plain English:
 * Fabric.js is a canvas library that makes objects (images, shapes)
 * draggable, scalable, and rotatable with touch support built in.
 *
 * We maintain TWO canvases — one for the front view, one for the back.
 * Only the active face canvas is visible; the other is hidden but
 * preserved in memory so switching faces doesn't lose placements.
 *
 * Key technical decisions:
 * - Positions stored as PERCENTAGES in editorStore, converted to
 *   pixels when placing on canvas and back to % when reading.
 *   This means the design renders correctly on any screen size.
 * - The product flat-lay image is the canvas background (not a
 *   Fabric object) — so it can't be accidentally selected/moved.
 * - Accessories are loaded as Fabric Image objects with their
 *   Cloudinary cutout URL (transparent PNG background).
 * - exportPNG() merges background + objects into a flat JPEG for
 *   the preview image uploaded to Cloudinary.
 */

interface EditorCanvasProps {
  frontImagePublicId: string;
  backImagePublicId:  string;
  activeFace: "front" | "back";
}

export interface EditorCanvasHandle {
  exportPNG: (face: "front" | "back") => Promise<Blob | null>;
  addAccessoryToCanvas: (cutoutUrl: string, accessoryId: string) => void;
}

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(
  function EditorCanvas({ frontImagePublicId, backImagePublicId, activeFace }, ref) {
    const frontCanvasEl = useRef<HTMLCanvasElement>(null);
    const backCanvasEl  = useRef<HTMLCanvasElement>(null);
    const frontFabric   = useRef<any>(null);
    const backFabric    = useRef<any>(null);
    const containerRef  = useRef<HTMLDivElement>(null);

    const { addPlacement, updatePlacement, removePlacement, placements } = useEditorStore();

    // ── Initialise Fabric canvases ─────────────────────────────────────────
    useEffect(() => {
      let isMounted = true;

      async function init() {
        // Dynamic import — Fabric.js is ~300KB, only load when editor opens
        const { Canvas, FabricImage, util } = await import("fabric");

        const container = containerRef.current;
        if (!container || !isMounted) return;

        const W = container.clientWidth;
        const H = container.clientHeight;

        // Helper: initialise one Fabric canvas with a background image
        async function makeCanvas(
          el: HTMLCanvasElement | null,
          imagePublicId: string
        ) {
          if (!el || !imagePublicId) return null;

          const fc = new Canvas(el, {
            width:               W,
            height:              H,
            selection:           true,
            preserveObjectStacking: true,
            backgroundColor:     "#FFFFFF",
          });

          // Load background image (product flat-lay)
          const bgUrl = cld(imagePublicId, "full");
          const bgImg = await FabricImage.fromURL(bgUrl, { crossOrigin: "anonymous" });

          // Scale background to fill canvas while maintaining aspect ratio
          const scale = Math.min(W / bgImg.width!, H / bgImg.height!);
          bgImg.set({
            scaleX:       scale,
            scaleY:       scale,
            left:         (W - bgImg.width!  * scale) / 2,
            top:          (H - bgImg.height! * scale) / 2,
            selectable:   false,
            evented:      false,
            excludeFromExport: false,
          });
          fc.add(bgImg);
          fc.sendObjectToBack(bgImg);

          // When any object is modified, update the store
          fc.on("object:modified", (e: any) => {
            const obj = e.target;
            if (!obj?.accessoryId) return;
            const face = el === frontCanvasEl.current ? "front" : "back";
            updatePlacement(obj.accessoryId, face, {
              xPercent: toPercent(obj.left!, W),
              yPercent: toPercent(obj.top!,  H),
              rotation: obj.angle ?? 0,
              scaleX:   obj.scaleX ?? 1,
              scaleY:   obj.scaleY ?? 1,
            });
          });

          fc.renderAll();
          return fc;
        }

        frontFabric.current = await makeCanvas(frontCanvasEl.current, frontImagePublicId);
        if (backImagePublicId) {
          backFabric.current = await makeCanvas(backCanvasEl.current, backImagePublicId);
        }
      }

      init();
      return () => {
        isMounted = false;
        frontFabric.current?.dispose();
        backFabric.current?.dispose();
      };
    }, [frontImagePublicId, backImagePublicId]);

    // ── Add accessory to active canvas ────────────────────────────────────
    const addAccessoryToCanvas = useCallback(
      async (cutoutUrl: string, accessoryId: string) => {
        const { FabricImage } = await import("fabric");
        const fc = activeFace === "front" ? frontFabric.current : backFabric.current;
        if (!fc) return;

        const W = fc.width!;
        const H = fc.height!;

        const img = await FabricImage.fromURL(cutoutUrl, { crossOrigin: "anonymous" });

        // Default size: ~20% of canvas width, centred
        const defaultW = W * 0.2;
        const scale    = defaultW / img.width!;

        img.set({
          left:       W / 2 - (img.width!  * scale) / 2,
          top:        H / 2 - (img.height! * scale) / 2,
          scaleX:     scale,
          scaleY:     scale,
          // Custom property so we can identify this object later
          accessoryId,
          cornerStyle: "circle",
          cornerColor: "#F7FD04",
          borderColor: "#0A0A0A",
          cornerSize:  10,
          transparentCorners: false,
        } as any);

        fc.add(img);
        fc.setActiveObject(img);
        fc.renderAll();

        // Record in store
        addPlacement({
          accessoryId: accessoryId as any,
          face:        activeFace,
          xPercent:    toPercent(img.left!, W),
          yPercent:    toPercent(img.top!,  H),
          rotation:    0,
          scaleX:      scale,
          scaleY:      scale,
          zIndex:      fc.getObjects().length,
        });
      },
      [activeFace, addPlacement]
    );

    // ── Export canvas as JPEG Blob ─────────────────────────────────────────
    const exportPNG = useCallback(
      async (face: "front" | "back"): Promise<Blob | null> => {
        const fc = face === "front" ? frontFabric.current : backFabric.current;
        if (!fc) return null;

        return new Promise((resolve) => {
          fc.renderAll();
          const dataUrl = fc.toDataURL({ format: "jpeg", quality: 0.85, multiplier: 2 });
          fetch(dataUrl)
            .then((r) => r.blob())
            .then(resolve)
            .catch(() => resolve(null));
        });
      },
      []
    );

    // ── Expose methods to parent via ref ──────────────────────────────────
    useImperativeHandle(ref, () => ({ exportPNG, addAccessoryToCanvas }), [
      exportPNG,
      addAccessoryToCanvas,
    ]);

    return (
      <div ref={containerRef} className="relative w-full h-full bg-white">
        {/* Front canvas */}
        <canvas
          ref={frontCanvasEl}
          className="absolute inset-0"
          style={{ display: activeFace === "front" ? "block" : "none" }}
        />
        {/* Back canvas */}
        {backImagePublicId && (
          <canvas
            ref={backCanvasEl}
            className="absolute inset-0"
            style={{ display: activeFace === "back" ? "block" : "none" }}
          />
        )}
      </div>
    );
  }
);
