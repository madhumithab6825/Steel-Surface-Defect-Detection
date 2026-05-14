import React, { useMemo } from "react";

interface Box {
  id: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  boxes: Box[];
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  setBoxes: any;
  images: File[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  allAnnotations: Record<string, Box[]>; // ⭐ NEW
}

const getColor = (id: number) => {
  const colors = ["#ef4444","#3b82f6","#10b981","#f59e0b","#8b5cf6","#ec4899"];
  return colors[Math.abs(id) % colors.length];
};

const RightPanel: React.FC<Props> = ({
  boxes,
  selectedId,
  setSelectedId,
  setBoxes,
  images,
  currentIndex,
  setCurrentIndex,
  allAnnotations
}) => {

  /* ========================================
     GLOBAL LABEL COUNTS (ALL IMAGES)
  ======================================== */
  const groupedLabels = useMemo(() => {
    const map: Record<string, number> = {};

    Object.values(allAnnotations).forEach((boxList) => {
      boxList.forEach((b) => {
        map[b.label] = (map[b.label] || 0) + 1;
      });
    });

    return map;
  }, [allAnnotations]);

  const renameLabel = (labelName: string) => {
    const newName = prompt("Rename label:", labelName);
    if (!newName) return;

    setBoxes((prev: Box[]) =>
      prev.map(b =>
        b.label === labelName ? { ...b, label: newName } : b
      )
    );
  };

  return (
    <div style={styles.panel}>
      {/* ================= LABELS ================= */}
      <div style={styles.labelsSection}>
        <h3 style={styles.sectionTitle}>Labels</h3>

        {Object.entries(groupedLabels).map(([name, count]) => (
          <div
            key={name}
            onDoubleClick={() => renameLabel(name)}
            style={styles.labelItem}
          >
            <strong>{name}</strong>
            <span style={{ marginLeft: 8 }}>({count})</span>
          </div>
        ))}
      </div>

      {/* ================= IMAGES ================= */}
      <div style={styles.imagesSection}>
        <h3 style={styles.sectionTitle}>Images</h3>

        {images.map((img, index) => (
          <div
            key={index}
            onClick={() => setCurrentIndex(index)}
            style={{
              ...styles.imageItem,
              background:
                index === currentIndex ? "#2563eb" : "#374151"
            }}
          >
            {img.name}
          </div>
        ))}

        <div style={{ marginTop: 10, fontSize: 13 }}>
          Progress: {images.length === 0 ? 0 : currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
};

const styles = {
  panel: {
    width: 300,
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    background: "#dbe7ed"
  },
  sectionTitle: { marginBottom: 10 },
  labelsSection: {
    flex: 1,
    overflowY: "auto" as const,
    padding: 10,
    borderBottom: "1px solid #94a3b8"
  },
  imagesSection: {
    flex: 1,
    overflowY: "auto" as const,
    padding: 10
  },
  labelItem: {
    padding: 8,
    marginBottom: 6,
    borderRadius: 6,
    background: "white",
    cursor: "pointer"
  },
  imageItem: {
    padding: 6,
    marginBottom: 4,
    borderRadius: 4,
    color: "white",
    cursor: "pointer",
    fontSize: 13
  }
};

export default RightPanel;