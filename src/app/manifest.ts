import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SIMORA · Monitoreo de Ruido Ambiental IoT",
    short_name: "SIMORA",
    description:
      "Sistema de Monitoreo de Ruido Ambiental mediante Sensores Móviles en Espacios Académicos",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090b0e",
    theme_color: "#090b0e",
    lang: "es",
    categories: ["education", "utilities", "productivity"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
