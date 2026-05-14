import React, { useState, useEffect } from "react";
import { api } from "../services/api";

const BASE = "http://127.0.0.1:8000";

const DetectionView: React.FC = () => {

  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);


  useEffect(() => {
    loadModels();
  }, []);


  const loadModels = async () => {
    try {
      const res = await api.getDetectionModels();
      if (res?.models) {
        setModels(res.models);
        if (res.models.length) setSelectedModel(res.models[0]);
      }
    } catch (e) {
      console.log(e);
    }
  };


  const handleDetect = () => {

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e: any) => {

      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setMessage(null);
      setResultImage(null);
      setDetections([]);

      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);

      setLoading(true);

      try {

        const res = await api.runDetection(selectedModel, file);

        if (res?.error) {
          setError(res.error);
          return;
        }

        if (res?.result_image) {
          const path = res.result_image.startsWith("http")
            ? res.result_image
            : BASE + res.result_image;
          setResultImage(path + "?t=" + Date.now());
        }

        if (res?.detections?.length) {
          setDetections(res.detections);
          setMessage(null);
        } else {
          setMessage(res?.message || "No detections above threshold");
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }

    };

    input.click();
  };


  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>

      <h2>Object Detection</h2>

      {/* MODEL SELECT */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>

        <label style={{ fontWeight: "bold" }}>Model:</label>

        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          style={{ padding: "6px 12px", fontSize: 14 }}
        >
          {models.length === 0 && <option value="">No models available</option>}
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <button
          onClick={loadModels}
          style={{ padding: "6px 12px" }}
        >
          Refresh
        </button>

        <button
          onClick={handleDetect}
          disabled={!selectedModel || loading}
          style={{
            padding: "8px 20px",
            background: selectedModel ? "#2f3fe0" : "#aaa",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: selectedModel ? "pointer" : "not-allowed",
            fontSize: 14
          }}
        >
          {loading ? "Detecting..." : "Upload & Detect"}
        </button>

      </div>

      {/* ERROR */}
      {error && (
        <div style={{ background: "#ffe0e0", color: "#c00", padding: 10, borderRadius: 4, marginBottom: 12 }}>
          ❌ {error}
        </div>
      )}

      {/* MESSAGE */}
      {message && !error && (
        <div style={{ background: "#fff8dc", color: "#666", padding: 10, borderRadius: 4, marginBottom: 12 }}>
          ⚠ {message}
        </div>
      )}

      {/* DETECTIONS LIST */}
      {detections.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong>Detections ({detections.length}):</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {detections.map((d, i) => (
              <span key={i} style={{
                background: "#e8f5e9",
                border: "1px solid #4caf50",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 13
              }}>
                {d.label} — {(d.score * 100).toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* IMAGES */}
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>

        {image && (
          <div>
            <h3>Input Image</h3>
            <img src={image} style={{ width: 500, borderRadius: 4 }} />
          </div>
        )}

        {resultImage && (
          <div>
            <h3>Detection Result</h3>
            <img src={resultImage} style={{ width: 500, borderRadius: 4 }} />
          </div>
        )}

      </div>

    </div>
  );

};

export default DetectionView;
