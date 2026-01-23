export default function Modal({ isOpen, open, onClose, children, title }) {
  const isModalOpen = isOpen || open;
  if (!isModalOpen) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          {title && <h2 style={titleStyle}>{title}</h2>}
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={content}>
           {children}
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  backdropFilter: "blur(2px)"
};

const modal = {
  background: "#fff",
  borderRadius: "12px",
  width: "90%",
  maxWidth: "500px",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  borderBottom: "1px solid #f3f4f6"
};

const titleStyle = {
  fontSize: "1.25rem",
  fontWeight: "700",
  color: "#111827",
  margin: 0
};

const content = {
  padding: "20px",
  overflowY: "auto"
};

const closeBtn = {
  border: "none",
  background: "none",
  fontSize: "24px",
  lineHeight: 1,
  color: "#9ca3af",
  cursor: "pointer",
  transition: "color 0.2s"
};
