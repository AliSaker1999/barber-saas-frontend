import { useState } from "react";

export default function OptimizedImage({
  src,
  alt,
  className = "",
  fallback = null,
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto",
  sizes,
  onError
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return fallback;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      sizes={sizes}
      onError={() => {
        setHasError(true);
        if (onError) onError();
      }}
    />
  );
}
