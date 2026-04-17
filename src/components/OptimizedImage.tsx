import { useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallback?: ReactNode;
  priority?: boolean;
}

export default function OptimizedImage({
  alt,
  className,
  fallback = null,
  onError,
  priority = false,
  src,
  ...props
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      className={cn(className)}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
    />
  );
}