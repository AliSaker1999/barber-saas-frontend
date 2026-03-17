import { useState, useEffect } from "react";
import api from "../services/api";
import { useI18n } from "../i18n";

export default function BarberGallery({ barberId, isOwner = false }) {
  const { t } = useI18n();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (!barberId) return;
    let cancelled = false;
    api
      .get(`/barbers/${barberId}/gallery`)
      .then((res) => { if (!cancelled) setImages(res.data.data || []); })
      .catch(() => { if (!cancelled) setImages([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [barberId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-app-surface-2 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📸</div>
        <p className="text-sm text-app-muted font-bold">{t("gallery")}</p>
        <p className="text-xs text-app-muted">{isOwner ? t("add_photo") : ""}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div
            key={img.Id}
            className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
            onClick={() => setSelectedImage(img)}
          >
            <img
              src={img.ImageUrl}
              alt={img.Caption || t("gallery")}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {img.Category && img.Category !== "general" && (
              <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full uppercase">
                {img.Category}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl font-bold z-10 hover:scale-110 transition-transform"
            onClick={() => setSelectedImage(null)}
          >
            &times;
          </button>
          <div className="max-w-2xl max-h-[80vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage.ImageUrl}
              alt={selectedImage.Caption || ""}
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
            {selectedImage.Caption && (
              <p className="text-white text-center mt-3 font-medium">
                {selectedImage.Caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
