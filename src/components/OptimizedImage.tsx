import { useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallback?: ReactNode;
  priority?: boolean;
  /** Skip the logo proxy (e.g., for non-API-Football images). */
  skipProxy?: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

// Hosts we proxy to eliminate slow third-party image waterfalls.
const PROXIED_HOSTS = new Set([
  "media.api-sports.io",
  "media-1.api-sports.io",
  "media-2.api-sports.io",
  "media-3.api-sports.io",
  "media-4.api-sports.io",
]);

function proxify(src: string): string {
  if (!SUPABASE_URL) return src;
  try {
    const u = new URL(src);
    if (!PROXIED_HOSTS.has(u.host)) return src;
    return `${SUPABASE_URL}/functions/v1/logo-proxy?url=${encodeURIComponent(src)}`;
  } catch {
    return src;
  }
}

export default function OptimizedImage({
  alt,
  className,
  fallback = null,
  onError,
  priority = false,
  src,
  skipProxy = false,
  ...props
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  const finalSrc = skipProxy ? String(src) : proxify(String(src));

  return (
    <img
      {...props}
      src={finalSrc}
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
