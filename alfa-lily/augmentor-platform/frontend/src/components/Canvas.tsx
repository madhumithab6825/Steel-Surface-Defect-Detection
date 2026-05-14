import React, { useRef, useEffect, useState } from "react";

interface Box {
  id: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  image: string | null;
  boxes: Box[];
  setBoxes: React.Dispatch<React.SetStateAction<Box[]>>;
  drawMode: boolean;
  zoom: number;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  setDrawMode?: (v: boolean) => void; // ⭐ optional for exiting draw mode
}

const HANDLE_SIZE = 8;
type ResizeCorner = "tl" | "tr" | "bl" | "br" | null;

const Canvas: React.FC<Props> = ({
  image,
  boxes,
  setBoxes,
  drawMode,
  zoom,
  selectedId,
  setSelectedId,
  setDrawMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<Box | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<ResizeCorner>(null);

  // ⭐ fit-to-workspace scale
  const [fitScale, setFitScale] = useState(1);

  /* ================= IMAGE LOAD ================= */

  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.src = image;

    img.onload = () => {
      imgRef.current = img;
      computeFitScale();
      draw();
    };

    return () => {
      imgRef.current = null;
    };
  }, [image]);

  /* ⭐ recompute fit when window resizes */
  useEffect(() => {
    const resize = () => {
      computeFitScale();
      draw();
    };

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  });

  useEffect(() => {
    draw();
  }, [boxes, zoom, preview, selectedId, fitScale]);

  /* ================= FIT SCALE ================= */

  const computeFitScale = () => {
    if (!imgRef.current || !containerRef.current) return;

    const img = imgRef.current;
    const container = containerRef.current;

    const availableWidth = container.clientWidth - 10;
    const availableHeight = container.clientHeight - 10;

    const scaleX = availableWidth / img.width;
    const scaleY = availableHeight / img.height;

    const scale = Math.min(scaleX, scaleY);

    setFitScale(scale);
  };

  /* ================= DRAWING ================= */

  const drawHandles = (ctx: CanvasRenderingContext2D, box: Box) => {
    ctx.fillStyle = "lime";

    const corners = [
      [box.x, box.y],
      [box.x + box.width, box.y],
      [box.x, box.y + box.height],
      [box.x + box.width, box.y + box.height]
    ];

    corners.forEach(([cx, cy]) => {
      ctx.fillRect(
        cx * zoom * fitScale - HANDLE_SIZE / 2,
        cy * zoom * fitScale - HANDLE_SIZE / 2,
        HANDLE_SIZE,
        HANDLE_SIZE
      );
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = zoom * fitScale;

    canvas.width = imgRef.current.width * scale;
    canvas.height = imgRef.current.height * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

    boxes.forEach((box) => {
      const active = box.id === selectedId;

      ctx.strokeStyle = active ? "blue" : "red";
      ctx.lineWidth = 2;

      ctx.strokeRect(
        box.x * scale,
        box.y * scale,
        box.width * scale,
        box.height * scale
      );

      ctx.fillStyle = active ? "blue" : "red";
      ctx.font = "14px Arial";
      ctx.fillText(
        box.label,
        box.x * scale + 4,
        box.y * scale - 6
      );

      if (active) drawHandles(ctx, box);
    });

    if (preview) {
      ctx.strokeStyle = "blue";
      ctx.strokeRect(
        preview.x * scale,
        preview.y * scale,
        preview.width * scale,
        preview.height * scale
      );
    }
  };

  /* ================= HELPERS ================= */

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scale = zoom * fitScale;

    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  const getBoxAt = (x: number, y: number) => {
    return boxes.find(
      (b) =>
        x >= b.x &&
        x <= b.x + b.width &&
        y >= b.y &&
        y <= b.y + b.height
    );
  };

  /* ================= MOUSE EVENTS ================= */

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const clicked = getBoxAt(pos.x, pos.y);

    if (clicked) {
      setSelectedId(clicked.id);
      setDragging(true);
      setStart(pos);
      return;
    }

    if (drawMode) {
      setSelectedId(null);
      setStart(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (dragging && start && selectedId !== null) {
      const dx = pos.x - start.x;
      const dy = pos.y - start.y;

      setBoxes((prev) =>
        prev.map((b) =>
          b.id === selectedId
            ? { ...b, x: b.x + dx, y: b.y + dy }
            : b
        )
      );

      setStart(pos);
      return;
    }

    if (drawMode && start) {
      const width = pos.x - start.x;
      const height = pos.y - start.y;

      setPreview({
        id: 0,
        label: "",
        x: width < 0 ? pos.x : start.x,
        y: height < 0 ? pos.y : start.y,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    }
  };

  const handleMouseUp = () => {
    if (dragging) {
      setDragging(false);
      return;
    }

    if (!drawMode || !preview) return;

    const label = prompt("Enter Label:");

    if (!label) {
      setPreview(null);
      setStart(null);
      return;
    }

    setBoxes((prev) => [
      ...prev,
      { ...preview, id: Date.now(), label }
    ]);

    // ⭐ exit draw mode ONLY after success
    if (setDrawMode) {
      setDrawMode(false);
    }

    setPreview(null);
    setStart(null);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          background: "#f3f4f6",
          cursor: drawMode ? "crosshair" : "default"
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};

export default Canvas;