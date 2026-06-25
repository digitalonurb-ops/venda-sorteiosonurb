import { useState, useEffect } from "react";
import imgleve from "@/assets/novologoODfundopreto.png";

interface BannerSettings {
  ativa: boolean;
  texto: string;
  cor: string;
  cor_texto: string;
}

const ImageCarousel = ({ banner, images }: { banner?: BannerSettings | null; images?: string[] }) => {
  const [current, setCurrent] = useState(0);
  const imageList = images && images.length > 0 ? images : [imgleve];

  useEffect(() => {
    setCurrent(0);
  }, [images]);

  useEffect(() => {
    if (imageList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((c) => (c === imageList.length - 1 ? 0 : c + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [imageList.length]);

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-lg">
      {imageList.map((img, i) => (
        <img
          key={i}
          src={img}
          alt="Campanha"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-100 ${
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

      {banner?.ativa && (
        <div
          className="absolute bottom-2 left-3 px-3 py-1 rounded-md text-xs font-bold shadow-lg animate-banner-blink"
          style={{ backgroundColor: banner.cor, color: banner.cor_texto }}
        >
          {banner.texto}
        </div>
      )}

      <div className="absolute top-3 right-3 bg-background/60 text-foreground text-xs px-2 py-1 rounded-full font-medium">
        {current + 1}/{imageList.length}
      </div>
    </div>
  );
};

export default ImageCarousel;
