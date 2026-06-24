import { useState, useEffect } from "react";
import imgleve from "@/assets/imgleve.webp";

const images = [imgleve];

interface BannerSettings {
  ativa: boolean;
  texto: string;
  cor: string;
  cor_texto: string;
}

const ImageCarousel = ({ banner }: { banner?: BannerSettings | null }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-lg">
      {images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt="20 MIL NO PIX"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
          width={512}
          height={342}
          fetchPriority="high"
          sizes="(max-width: 512px) 100vw, 512px"
          decoding="async"
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

      {/* Banner piscando */}
      {banner?.ativa && (
        <div
          className="absolute bottom-2 left-3 px-3 py-1 rounded-md text-xs font-bold shadow-lg animate-banner-blink"
          style={{ backgroundColor: banner.cor, color: banner.cor_texto }}
        >
          {banner.texto}
        </div>
      )}

      <div className="absolute bottom-4 left-4">
        <h2 className="text-xl font-bold text-foreground"></h2>
        <p className="text-sm text-primary font-semibold"></p>
      </div>
      <div className="absolute top-3 right-3 bg-background/60 text-foreground text-xs px-2 py-1 rounded-full font-medium">
        {current + 1}/{images.length}
      </div>
    </div>
  );
};

export default ImageCarousel;
