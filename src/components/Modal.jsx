import { useCallback } from "react";

export default function Modal({ isOpen, open, onClose, children, title }) {
  const isModalOpen = isOpen || open;

  const stopPropagation = useCallback((event) => {
    event.stopPropagation();
  }, []);

  if (!isModalOpen) return null;

  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div className="app-modal" onClick={stopPropagation}>
        <div className="app-modal-header">
          {title && <h2 className="app-modal-title">{title}</h2>}
          <button type="button" onClick={onClose} className="app-modal-close" aria-label="Close">✕</button>
        </div>
        <div className="app-modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}
