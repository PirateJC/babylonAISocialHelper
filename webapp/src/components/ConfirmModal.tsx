interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  warning?: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/* ── styles ─────────────────────────────────────────────── */

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialog: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: "28px 32px",
  maxWidth: 440,
  width: "90%",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const btnRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 24,
};

const btnBase: React.CSSProperties = {
  padding: "8px 20px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

/* ── component ───────────────────────────────────────────── */

export default function ConfirmModal({
  isOpen,
  title,
  message,
  warning,
  confirmLabel,
  confirmColor = "#dc2626",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div style={overlay} onClick={onCancel}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
        <p style={{ margin: "12px 0 0", color: "#374151", lineHeight: 1.5 }}>
          {message}
        </p>
        {warning && (
          <p
            style={{
              margin: "8px 0 0",
              color: "#dc2626",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {warning}
          </p>
        )}
        <div style={btnRow}>
          <button
            style={{ ...btnBase, background: "#f3f4f6", color: "#374151" }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            style={{ ...btnBase, background: confirmColor, color: "#fff" }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
