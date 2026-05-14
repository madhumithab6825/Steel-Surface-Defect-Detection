import { useState } from "react";
import { api } from "../services/api";

const BASE = "http://127.0.0.1:8000";

const Augment = () => {

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [xmlFiles, setXmlFiles] = useState<File[]>([]);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [augImages, setAugImages] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const extractLabels = async (files: File[]) => {
    const set = new Set<string>();
    for (const f of files) {
      if (!f.name.endsWith(".xml")) continue;
      const txt = await f.text();
      const matches = [...txt.matchAll(/<name>(.*?)<\/name>/g)];
      matches.forEach(m => set.add(m[1]));
    }
    const arr = Array.from(set);
    setLabels(arr);
    if (arr.length) setSelectedLabel(arr[0]);
  };

  const handleAugment = async () => {

    if (!imageFiles.length || !xmlFiles.length) {
      addLog("❌ Select both image files and XML annotation files");
      return;
    }

    if (!sourceFile) {
      addLog("❌ Select a source/background image");
      return;
    }

    if (!selectedLabel) {
      addLog("❌ No label selected");
      return;
    }

    try {
      setLoading(true);
      setAugImages([]);

      addLog("Generating masks...");
      await api.generateMasks(imageFiles, xmlFiles, selectedLabel);
      addLog("✅ Masks generated");

      addLog(`Starting augmentation (${quantity} images)...`);
      const res = await api.augmentDataset(sourceFile, quantity, selectedLabel);

      if (res?.augmented?.length) {
        const urls = res.augmented.map(
          (name: string) => `${BASE}/augment/output/${name}`
        );
        setAugImages(urls);
        addLog(`✅ Done — ${urls.length} images created`);
      } else {
        addLog("⚠ No augmented images returned");
      }

    } catch (err: any) {
      addLog("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: "sans-serif" }}>

      <h2>Dataset Augmentation</h2>

      {/* ANNOTATED IMAGES */}
      <div style={row}>
        <label style={lbl}>Annotated Images:</label>
        <input type="file" multiple accept="image/*"
          onChange={e => setImageFiles(Array.from(e.target.files || []))} />
        <span style={hint}>{imageFiles.length} selected</span>
      </div>

      {/* XML FILES */}
      <div style={row}>
        <label style={lbl}>XML Annotations:</label>
        <input type="file" multiple accept=".xml"
          onChange={async e => {
            const files = Array.from(e.target.files || []);
            setXmlFiles(files);
            await extractLabels(files);
          }} />
        <span style={hint}>{xmlFiles.length} selected</span>
      </div>

      {/* SOURCE IMAGE */}
      <div style={row}>
        <label style={lbl}>Source Image:</label>
        <input type="file" accept="image/*"
          onChange={e => setSourceFile(e.target.files?.[0] || null)} />
        <span style={hint}>{sourceFile?.name || "none"}</span>
      </div>

      {/* LABEL */}
      <div style={row}>
        <label style={lbl}>Label:</label>
        <select value={selectedLabel} onChange={e => setSelectedLabel(e.target.value)}
          style={{ padding: "4px 8px" }}>
          {labels.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* QUANTITY */}
      <div style={row}>
        <label style={lbl}>Quantity:</label>
        <input type="number" value={quantity} min={1} max={500}
          onChange={e => setQuantity(Number(e.target.value))}
          style={{ width: 80, padding: "4px 8px" }} />
      </div>

      <br />

      <button onClick={handleAugment} disabled={loading}
        style={{ padding: "8px 24px", background: "#2f3fe0", color: "white", border: "none", borderRadius: 4, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? "Augmenting..." : "Start Augmentation"}
      </button>

      {/* LOG */}
      {log.length > 0 && (
        <div style={{ marginTop: 16, background: "#f0f0f0", padding: 10, borderRadius: 4, maxHeight: 150, overflowY: "auto" }}>
          {log.map((l, i) => <div key={i} style={{ fontSize: 13 }}>{l}</div>)}
        </div>
      )}

      {/* RESULTS */}
      {augImages.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Results ({augImages.length})</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {augImages.map((src, i) => (
              <img key={i} src={src} style={{ width: "100%", borderRadius: 4 }} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 };
const lbl: React.CSSProperties = { width: 160, fontWeight: "bold", fontSize: 14 };
const hint: React.CSSProperties = { fontSize: 12, color: "#666" };

export default Augment;
