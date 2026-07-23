<div align="center">

<br />

<img src="https://img.shields.io/badge/Status-Live-22c55e?style=for-the-badge&logoColor=white" alt="status" />
<img src="https://img.shields.io/badge/Three.js-r160-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="threejs" />
<img src="https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="react" />
<img src="https://img.shields.io/badge/TypeScript-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" />
<img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="tailwind" />
<img src="https://img.shields.io/badge/Vite-5.0-646cff?style=for-the-badge&logo=vite&logoColor=white" alt="vite" />

<br /><br />

```
███████╗███╗   ██╗██████╗████████╗██╗  ██╗██████╗ ███████╗███╗   ██╗██████╗ ███████╗██╗██████╗ 
██╔════╝████╗  ██║██╔══██╗╚══██╔══╝██║  ██║██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝██║██╔══██╗
█████╗  ██╔██╗ ██║██████╔╝   ██║   ███████║██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ██║██████╔╝
██╔══╝  ██║╚██╗██║██╔══██╗   ██║   ██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ██║██╔══██╗
███████╗██║ ╚████║██║  ██║   ██║   ██║  ██║██████╔╝███████╗██║ ╚████║██████╔╝███████╗██║██║  ██║
╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝
```

### **Earthbender** — Gerçek Zamanlı Yörünge & 3D Gök Cismi Simülatörü

**8K Fotogerçekçi Gezegenler** · 10,000+ Canlı Uydu · Dünya, Ay & Güneş · WebGL & Three.js

[🚀 Canlı Uygulama](http://localhost:3001) · [📡 CelesTrak TLE API](https://celestrak.org/) · [⚡ Satellite.js](https://github.com/shashwatak/satellite-js)

</div>

---

## ✦ Genel Bakış

**Earthbender**, Dünya etrafındaki 10.000'den fazla uydunun (Starlink, ISS, Hubble, GPS, enkazlar) yörüngelerini **SGP4 uzay fiziği hesaplamaları** ile gerçek zamanlı olarak 3D uzay ortamında simüle eden fotogerçekçi bir uzay gözlem platformudur. 

Platform; **Dünya (Earth)**, **Ay (Moon)** ve **Güneş (Sun)** gök cisimlerini 8K yüksek çözünürlüklü kaplamalar, özel GLSL plazma/atmosfer shader'ları ve sinematik kamera takibi ile 3D ortamda sunar.

> **Tüm yörüngeler gerçektir.** Uyduların anlık ECI konumları NORAD TLE verileri üzerinden `satellite.js` ve Web Workers ile mikro-saniyelik hassasiyetle hesaplanır.

---

## ⚡ Öne Çıkan Özellikler

| Özellik | Açıklama |
|--------|----------|
| 🌍 **8K Fotogerçekçi Dünya** | 8192x4096 Gündüz, Gece, Bulut, Topografya Bump & Speküler Yansıma katmanları. |
| 🌕 **8K Ay & Krater Topografyası** | Ay 3D küresi, 8K Bump map, regolit yansıması ve Apollo İniş Bölgeleri. |
| ☀️ **8K 3D Güneş & Canlı Plazma** | GLSL plazma akışı, fotosfer fırtına animasyonu ve Hacimsel Korona Tacı. |
| 🛰️ **10,000+ Canlı Uydu Takibi** | Starlink, ISS, Hubble, GPS ve uzay enkazlarının canlı SGP4 yörünge simülasyonu. |
| 📡 **3D Sinyal Kapsama Konisi** | Seçilen uydunun kapsama alanını ve radyo frekans konisini Dünya üzerine çizer. |
| 🏙️ **Metropol & İniş Bölgeleri** | İstanbul, Tokyo, London, NY ve Apollo 11/12/15/17 iniş sahaları 3D pin etiketleri. |
| 🌍 **23.44° Gerçek Eksen Eğikliği** | Astronomik mevsimsel Güneş ışığı açısı ve kutup gecesi/gündüzü fiziği. |
| 🎥 **Sinematik Uydu Uçuş Kamerası** | Uydunun veya gök cisminin yörünge hareketine yumuşak ivmeyle kitlenen kamera. |
| ⏱️ **Zaman Makinesi & Zaman Çubuğu** | Zamanı ileri/geri sarma, simülasyon hızını ayarlama ve anlık TLE güncelleme. |

---

## 🛠️ Teknoloji

```
Çatı         →  Vite 5 · React 18 · TypeScript
3D Motoru    →  Three.js (r160) · GLSL Custom Shaders · Post-processing Bloom
Uzay Fiziği →  SGP4 Orbit Propagator · Satellite.js · Web Workers
Stil         →  Tailwind CSS v3.4 · Glassmorphism HUD
Veri Kaynağı →  CelesTrak NORAD Live TLE Data (Active + Debris)
```

---

## 🔄 Proje Yapısı

```
Earthbender/
├── app/
│   ├── public/
│   │   ├── textures/       # 8K Earth Day, Night, Clouds, Bump, Moon & Sun maps
│   │   └── data/           # Live NORAD TLE Data Snapshots
│   ├── src/
│   │   ├── components/
│   │   │   └── hud/        # IdentityBlock, ClockCard, SearchBox, LayerPanel, DetailPanel
│   │   ├── hooks/          # useTleData, useSimClock, usePropagator
│   │   ├── lib/            # globe-engine.ts (3D Core Engine) · satellites.ts
│   │   ├── workers/        # propagator.worker.ts (Background SGP4 Calculation)
│   │   └── pages/          # Home.tsx (Main 3D Viewport)
```

---

## 🚀 Kurulum & Çalıştırma

### Gereksinimler
- Node.js `>= 18`
- npm `>= 9`

```bash
# Projeye gidin
cd app

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev        # http://localhost:3001

# Derleme / Build
npm run build
```

---

<div align="center">

Uzay meraklıları ve araştırmacılar için ❤️ ile yapıldı · **[kutluhangil](https://github.com/kutluhangil)**

<br />

*Faydalı bulduysan bir ⭐ bırakmayı düşün.*

</div>
