"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type ProductImage = {
  url: string;
  altText?: string | null;
};

type ProductImageGalleryProps = {
  images: ProductImage[];
  productName: string;
};

export function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const selected = images[selectedIndex] ?? null;

  const goToPrev = useCallback(() => {
    setSelectedIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setSelectedIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, goToPrev, goToNext]);

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => selected && setLightboxOpen(true)}
          className="relative block w-full aspect-square overflow-hidden rounded-lg bg-slate-100 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label="View full image"
        >
          {selected ? (
            <Image
              src={selected.url}
              alt={selected.altText ?? productName}
              fill
              sizes="(min-width: 1024px) 650px, 100vw"
              className="object-cover transition-opacity duration-200"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No image
            </div>
          )}
        </button>

        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.slice(0, 4).map((image, index) => (
              <button
                key={image.url}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`View image ${index + 1}`}
                aria-pressed={index === selectedIndex}
                className={`relative aspect-square overflow-hidden rounded-md border bg-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  index === selectedIndex
                    ? "border-teal-500 ring-1 ring-teal-500"
                    : "border-slate-200 hover:border-teal-300"
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.altText ?? `${productName} image ${index + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selected.url}
              alt={selected.altText ?? productName}
              width={1000}
              height={1000}
              className="max-h-[85vh] w-auto rounded-lg object-contain shadow-2xl"
              unoptimized
            />

            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-label="Close image viewer"
            >
              <X className="h-4 w-4" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goToPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      aria-label={`Go to image ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all focus:outline-none ${
                        i === selectedIndex
                          ? "w-4 bg-white"
                          : "w-1.5 bg-white/50 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
