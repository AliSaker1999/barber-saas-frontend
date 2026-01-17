export default function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        <button onClick={onClose} style={closeBtn}>✕</button>
        {children}
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000
};

const modal = {
  background: "#fff",
  padding: 20,
  borderRadius: 6,
  width: 400
};

const closeBtn = {
  float: "right",
  border: "none",
  background: "none",
  fontSize: 18,
  cursor: "pointer"
};
