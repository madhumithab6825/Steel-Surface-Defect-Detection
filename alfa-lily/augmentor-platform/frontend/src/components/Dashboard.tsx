import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE = "http://127.0.0.1:8000";

const CARDS = [
  {
    route: "/annotate",
    emoji: "📝",
    title: "Annotate",
    desc: "Draw bounding boxes on images and save Pascal VOC XML annotations.",
    color: "#4f46e5",
    light: "#eef2ff",
    step: "Step 1",
  },
  {
    route: "/augment",
    emoji: "🔁",
    title: "Augment",
    desc: "Generate augmented training images using Poisson blending and masks.",
    color: "#0891b2",
    light: "#ecfeff",
    step: "Step 2",
  },
  {
    route: "/train",
    emoji: "🏋️",
    title: "Train",
    desc: "Train an EfficientDet detection model on your augmented dataset.",
    color: "#16a34a",
    light: "#f0fdf4",
    step: "Step 3",
  },
  {
    route: "/detect",
    emoji: "🔍",
    title: "Detect",
    desc: "Run inference on new images and visualize detected defects.",
    color: "#dc2626",
    light: "#fef2f2",
    step: "Step 4",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [trainStatus, setTrainStatus] = useState("Idle");

  useEffect(() => {
    // check backend health
    fetch(`${BASE}/health`)
      .then(r => r.ok ? setBackendOk(true) : setBackendOk(false))
      .catch(() => setBackendOk(false));

    // load models
    fetch(`${BASE}/detect/models`)
      .then(r => r.json())
      .then(d => setModels(d.models || []))
      .catch(() => {});

    // load train status
    fetch(`${BASE}/train/status`)
      .then(r => r.json())
      .then(d => setTrainStatus(d.status || "Idle"))
      .catch(() => {});
  }, []);

  return (
    <div style={styles.page}>

      {/* ── HEADER ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🚀 Augmentor Platform</h1>
          <p style={styles.subtitle}>
            End-to-end pipeline: Annotate → Augment → Train → Detect
          </p>
        </div>

        {/* backend status pill */}
        <div style={{
          ...styles.pill,
          background: backendOk === true ? "#dcfce7" : backendOk === false ? "#fee2e2" : "#f3f4f6",
          color: backendOk === true ? "#16a34a" : backendOk === false ? "#dc2626" : "#6b7280",
        }}>
          {backendOk === true ? "● Backend Online" : backendOk === false ? "● Backend Offline" : "● Checking..."}
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={styles.statsBar}>
        <StatBox label="Models Trained" value={models.length} color="#4f46e5" />
        <StatBox label="Last Train Status" value={trainStatus.length > 30 ? trainStatus.slice(0, 30) + "…" : trainStatus} color="#16a34a" />
        <StatBox label="Available Models" value={models.join(", ") || "None"} color="#0891b2" />
      </div>

      {/* ── WORKFLOW CARDS ── */}
      <div style={styles.grid}>
        {CARDS.map(card => (
          <div
            key={card.route}
            style={{ ...styles.card, borderTop: `4px solid ${card.color}` }}
            onClick={() => navigate(card.route)}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ ...styles.stepBadge, background: card.color }}>
              {card.step}
            </div>

            <div style={{ ...styles.emojiBox, background: card.light }}>
              <span style={{ fontSize: 36 }}>{card.emoji}</span>
            </div>

            <h2 style={{ ...styles.cardTitle, color: card.color }}>{card.title}</h2>
            <p style={styles.cardDesc}>{card.desc}</p>

            <div style={{ ...styles.goBtn, background: card.color }}>
              Open {card.title} →
            </div>
          </div>
        ))}
      </div>

      {/* ── WORKFLOW ARROW ── */}
      <div style={styles.flowRow}>
        {["Annotate", "Augment", "Train", "Detect"].map((s, i, arr) => (
          <React.Fragment key={s}>
            <span style={styles.flowStep}>{s}</span>
            {i < arr.length - 1 && <span style={styles.arrow}>→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* ── MODELS LIST ── */}
      {models.length > 0 && (
        <div style={styles.modelsBox}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>🗂 Trained Models</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {models.map(m => (
              <span key={m} style={styles.modelTag}>{m}</span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};


const StatBox = ({ label, value, color }: { label: string; value: any; color: string }) => (
  <div style={{ ...styles.statBox, borderLeft: `4px solid ${color}` }}>
    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{value}</div>
  </div>
);


const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    padding: "40px 48px",
    fontFamily: "'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
    color: "#0f172a",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 15,
  },
  pill: {
    padding: "8px 16px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  },
  statsBar: {
    display: "flex",
    gap: 16,
    marginBottom: 36,
  },
  statBox: {
    flex: 1,
    background: "white",
    borderRadius: 10,
    padding: "14px 18px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20,
    marginBottom: 32,
  },
  card: {
    background: "white",
    borderRadius: 14,
    padding: 24,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    transition: "transform 0.2s, box-shadow 0.2s",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    position: "relative",
  },
  stepBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    color: "white",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
  },
  emojiBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  },
  cardDesc: {
    margin: 0,
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.6,
    flex: 1,
  },
  goBtn: {
    color: "white",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    textAlign: "center",
    marginTop: 4,
  },
  flowRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 28,
  },
  flowStep: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "6px 16px",
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
  },
  arrow: {
    color: "#94a3b8",
    fontSize: 18,
    fontWeight: 700,
  },
  modelsBox: {
    background: "white",
    borderRadius: 12,
    padding: "16px 20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  modelTag: {
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 13,
    color: "#334155",
  },
};

export default Dashboard;
