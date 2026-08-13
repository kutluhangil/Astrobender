<div align="center">

<br />

<img src="https://img.shields.io/badge/Status-Interactive-22d3ee?style=for-the-badge&logoColor=black" alt="Durum: etkileşimli" />
<img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
<img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
<img src="https://img.shields.io/badge/three.js-r185-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="three.js r185" />
<img src="https://img.shields.io/badge/Vite-7-646cff?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 7" />
<img src="https://img.shields.io/badge/WebGL-2-990000?style=for-the-badge&logo=webgl&logoColor=white" alt="WebGL 2" />

<br /><br />

```text
   █████╗ ███████╗████████╗██████╗  ██████╗ ██████╗ ███╗   ██╗██████╗ ███████╗██████╗
  ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗██╔══██╗████╗  ██║██╔══██╗██╔════╝██╔══██╗
  ███████║███████╗   ██║   ██████╔╝██║   ██║██████╔╝██╔██╗ ██║██████╔╝█████╗  ██████╔╝
  ██╔══██║╚════██║   ██║   ██╔══██╗██║   ██║██╔══██╗██║╚██╗██║██╔══██╗██╔══╝  ██╔══██╗
  ██║  ██║███████║   ██║   ██║  ██║╚██████╔╝██████╔╝██║ ╚████║██████╔╝███████╗██║  ██║
  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝
```

### **ASTROBENDER** — Güneş Sistemi, Dünya yörüngesi ve canlı uzay verileri için etkileşimli 3B gözlemevi.

**JPL tabanlı yörüngeler** · **SGP4 uydu yayılımı** · **TR / EN arayüz** · **tarayıcıda WebGL**

</div>

---

## ✦ Genel Bakış

**ASTROBENDER**, Güneş Sistemi'ni ve Dünya çevresindeki yapay uyduları aynı Three.js sahnesinde incelemek için geliştirilmiş etkileşimli bir web uygulamasıdır. Gezegenlere veya uydularına tıklayarak hedefe uçabilir; fiziksel profilini, kimyasını ve bilim notlarını inceleyebilirsin.

Uygulama, ana gezegenlerin astronomik yörünge sırasını korur; ancak milyarlarca kilometrelik uzay mesafelerini tarayıcıda gezilebilir tutmak için görsel olarak sıkıştırır. Arayüzdeki içerik canlı, hesaplanan, kaynaklı statik veya açıkça şematik olabilir; bir küre ya da işaretin sahnedeki konumu tek başına ölçüm değildir.

<div align="center">
  <img src="screenshots/v-desktop.png" alt="ASTROBENDER masaüstü görünümü: Dünya, uydu noktaları ve kontrol panelleri" width="100%" />
  <sub><i>Dünya varsayılan hedef olarak açılır; parlak uydu noktaları ve Dünya yüzey katmanları korunur.</i></sub>
</div>

---

## ⚡ Öne Çıkan Özellikler

| Özellik | Açıklama |
|---|---|
| 🌍 **3B Dünya** | Kaynaklı gündüz/gece dokuları, bulut katmanı, yüzey parlaklığı ve SGP4 ile hesaplanan yapay uydu noktaları. |
| 🪐 **Gezegen ve uydu sistemleri** | Güneş, sekiz gezegen, cüce gezegenler ve seçilebilir büyük uydular; halkalı dev gezegen sistemleri. |
| 🧪 **Fiziksel profil** | Seçilen cisim için kütle, yoğunluk, yüzey yerçekimi, sıcaklık, kimya/yüzey özeti ve bilim notu. |
| 🛰️ **TLE + SGP4** | CelesTrak TLE paketleri, `satellite.js` ile tarayıcıda yörünge yayılımı ve IndexedDB önbelleği. |
| 🔭 **Dünya Gözlemevi** | NASA EONET olayları, USGS depremleri ve NOAA aurora öngörüsünü kaynak bağlantılarıyla katman olarak açar. |
| ☄️ **Küçük cisimler** | JPL Close Approach Data üzerinden yakın geçişler ve kaynaklı katalog kartları; sentetik asteroit/Kuiper kuşakları varsayılan kapalı şematik yardımcıdır. |
| ✨ **Takımyıldızlar ve görevler** | 88 IAU takımyıldız adını aramada ve kaynaklı görev kartlarında sunar; IAU çizgi şekli ve efemerissiz sonda konumu çizmez. |
| 🎬 **Sinematik uzay turu** | Türkçe ve İngilizce anlatım dosyalarıyla zaman kodlu kamera rotası. |
| 🔎 **Tek arama kutusu** | Gök cismi, uydu, görev, yüzey konumu veya NORAD numarasını tek yerden bulur. |
| 🌐 **TR / EN** | Arayüz, hedef bilgileri ve sinematik tur için iki dil desteği. |

---

## 🧭 Gezegen Konumu ve Ölçek Modeli

Sekiz ana gezegenin konumu, JPL Solar System Dynamics'in 1800–2050 için yayımladığı yaklaşık Kepler elemanlarından hesaplanır. Büyük doğal uydular ortalama elemanlarla görselleştirilir; kararlı bir salınımlı faz bulunmayan kayıtlarda başlangıç fazı deterministik bir sahne seçimidir. Plüton ve diğer cüce gezegenlerin konumları Horizons efemerisi değildir ve şematik gezinme modeli olarak değerlendirilmelidir.

Gerçek Güneş Sistemi ölçeği bir tarayıcı sahnesi için aşırı büyüktür. ASTROBENDER bunun yerine tekdüze bir mesafe sıkıştırması kullanır:

```text
JPL ana-gezegen elemanları ──▶ hesaplanan konum ──▶ görsel mesafe sıkıştırması ──▶ WebGL sahnesi
                                      │
                                      └── AU etiketi gerçek yarı-büyük eksen değerini gösterir
```

- Sahnedeki uzaklıklar **navigasyon için sıkıştırılmıştır**.
- Ana gezegenlerin yörünge sırası **korunur**; cüce gezegen modeli şematiktir.
- Arayüzdeki AU etiketi, sahnedeki çizim yarıçapı değil; katalogdaki yarı-büyük eksen değeridir.
- Uydu sistemleri ayrı bir görsel ölçek kullanır; sahne fazı her kayıt için gözlemsel efemeris değildir.

---

## 🗂️ Veri Kaynakları ve Gerçeklik Notu

| Kaynak | Uygulamada kullanımı | Sınıf |
|---|---|:---:|
| [JPL SSD — gezegen konumları](https://ssd.jpl.nasa.gov/planets/approx_pos.html) | Sekiz ana gezegenin yaklaşık Kepler elemanları | Hesaplanan |
| [JPL SSD — doğal uydu elemanları](https://ssd.jpl.nasa.gov/sats/elem/sep.html) | Büyük uyduların ortalama yörünge modeli | Hesaplanan / sınırlı |
| [JPL fiziksel parametreleri](https://ssd.jpl.nasa.gov/planets/phys_par.html) | Gezegen fiziksel profilleri | Kaynaklı statik |
| [JPL uydu fiziksel parametreleri](https://ssd.jpl.nasa.gov/sats/phys_par/) | Doğal uydu fiziksel profilleri | Kaynaklı statik |
| [CelesTrak](https://celestrak.org/NORAD/elements/) | Kaynak-zamanlı TLE paketi ve erişilebildiğinde güncel uydu verisi | Kaynaklı statik / canlı |
| [IMO 2026 Takvimi](https://www.imo.net/files/meteor-shower/cal2026.pdf) | Desteklenen 2026 Perseid etkinlik ve maksimum penceresi | Kaynaklı statik |
| [NASA Solar System Exploration](https://science.nasa.gov/solar-system/) | Bilim notları ve gök cismi açıklamaları | Kaynaklı statik |
| [NASA EONET](https://eonet.gsfc.nasa.gov/) | Doğal olay katmanı | Canlı |
| [USGS Earthquake Hazards](https://earthquake.usgs.gov/) | Deprem katmanı | Canlı |
| [NOAA SWPC](https://www.swpc.noaa.gov/) | Aurora öngörü katmanı | Canlı |

Fiziksel değerler, panelde okunabilir kalmaları için yuvarlanır. Küçük ve düzensiz bir uydunun kütlesi, yoğunluğu veya yüzey yerçekimi güvenilir biçimde yayımlanmamışsa uygulama değer icat etmez; **“Güvenilir ölçüm yok”** yazar.

> Canlı TLE, Dünya Gözlemevi veya JPL yakın geçiş verisi ağdan alınamazsa uygulama hatayı gizlemez: kaynak ve HTTP/ağ nedeni arayüzde görünür; mevcut geçerli veri kullanılmaya devam eder.

---

## 🛰️ Render ve Veri Akışı

```text
CelesTrak TLE ──▶ IndexedDB önbelleği ──▶ satellite.js / SGP4 ──▶ yapay uydu noktaları

JPL ana-gezegen + ortalama uydu elemanları ──▶ orbital-mechanics ──▶ sıkıştırılmış 3B konumlar
                                                         │
NASA / USGS Astrogeology dokuları ──────────────────────┼──▶ Three.js / WebGL sahnesi
                                                         │
NASA EONET · USGS · NOAA ──▶ Dünya Gözlemevi katmanları ─┘
```

- **Dünya:** yüksek çözünürlüklü gün/gece, bulut, specular ve kabartı dokuları.
- **Gezegenler ve uydular:** dosya kaynakları ve dönüşümleri attribution kaydında tutulan yüzey varlıkları; küre önizlemeleri bilimsel ölçüm değildir.
- **Europa, Titania, Oberon, Triton ve Plüton:** görsel süreklilik için kullanılan küre dokuları gözlemsel efemeris veya eksiksiz küresel ölçüm iddiası taşımaz.
- **Yapay uydular:** gerçek edinim zamanını koruyan paketli TLE ile açılır; kaynak erişilebildiğinde CelesTrak verisiyle güncellenir.
- **Derin uzay görevleri:** kaynaklı görev kartları gösterilir; Task 4'te Horizons kaydı gelene kadar 3B konum çizilmez.

---

## 📐 Proje Yapısı

```text
Earthbender/
├── app/
│   ├── src/
│   │   ├── pages/Home.tsx                # ana gözlemevi ve HUD bileşimi
│   │   ├── lib/globe-engine.ts           # Three.js sahne, kamera, seçim ve render
│   │   ├── lib/orbital-mechanics.ts      # JPL tabanlı yörünge hesapları
│   │   ├── lib/celestial-catalog.ts      # kaynaklı gök cismi kataloğu
│   │   ├── lib/celestial-physical-profiles.ts # kütle, yoğunluk, yerçekimi, kimya
│   │   ├── lib/earth-observatory.ts      # NASA / USGS / NOAA veri ayrıştırması
│   │   ├── hooks/useTleData.ts            # TLE önbellek ve canlı güncelleme
│   │   ├── components/hud/                # bilgi kartları, arama ve katman kontrolleri
│   │   ├── public/textures/               # gezegen, uydu ve Dünya dokuları
│   │   └── public/audio/                  # TR / EN sinematik tur anlatımları
│   ├── api/jpl-cad.ts                     # JPL CAD aynı-köken proxy'si
│   ├── tests/                             # birim, katalog ve bütünlük testleri
│   ├── e2e/                               # Playwright kullanıcı akışları
│   └── vercel.json                        # SPA yönlendirmesi ve güvenlik başlıkları
├── screenshots/                           # README görselleri
├── CHANGELOG.md
└── README.md
```

---

## 🛠️ Teknoloji

```text
Uygulama      → React 19 · TypeScript 5 · Vite 7
3B render     → Three.js r185 · WebGL 2
Yörünge       → satellite.js 6 · SGP4 · JPL Kepler elemanları
Stil          → Tailwind CSS 3 · tailwindcss-animate
Test          → Node test runner · Playwright · ESLint
Dağıtım       → Vercel yapılandırması · CSP ve temel güvenlik başlıkları
```

---

## 🚀 Yerel Kurulum

### Gereksinimler

- Güncel Node.js LTS (Node 20+ önerilir)
- WebGL 2 destekleyen modern tarayıcı

```bash
git clone https://github.com/kutluhangil/Astrobender.git
cd Astrobender/app

npm install
npm run dev
```

Vite port uygunluğuna göre uygulamayı bir yerel adreste açar. Bu çalışma alanındaki varsayılan geliştirme adresi `http://127.0.0.1:3000/` olabilir.

### Kontrol Komutları

```bash
cd app

npm test                 # katalog, yörünge, veri ve bütünlük testleri
npm run lint             # ESLint
npm run build            # TypeScript + Vite production build
npm run test:e2e         # Playwright kullanıcı akışları
npm run verify           # yukarıdaki doğrulama zinciri
npm run verify:textures  # uydu dokusu kontrolleri
```

> Ortam değişkeni, gizli anahtar veya veritabanı kurulumu gerekmiyor. Canlı veri kaynakları erişilemezse uygulama bunu görünür biçimde bildirir.

---

## 🖥️ Ekranlar

<div align="center">
  <img src="screenshots/v-laptop.png" alt="ASTROBENDER dizüstü bilgisayar görünümü" width="49%" />
  <img src="screenshots/v-mobile.png" alt="ASTROBENDER mobil görünümü" width="49%" />
  <br />
  <sub><i>Sol: masaüstü gözlemevi. Sağ: mobil düzen ve dokunmatik kontroller.</i></sub>
</div>

---

## ♿ Güvenlik ve Erişilebilirlik

- Vercel yanıtlarında CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` ve çerçeveleme koruması bulunur.
- Diyaloglarda `role="dialog"`, `aria-modal`, odak yönetimi ve Escape ile kapatma desteği vardır.
- Görünür odak stilleri, klavyeyle arama ve azaltılmış hareket tercihi desteklenir.
- Haricî font bağımlılığı yoktur.

---

<div align="center">

**ASTROBENDER** · Kaynaklara dayalı, gezilebilir Güneş Sistemi gözlemevi

<sub>Bilimsel değerleri bağlamıyla gösterir; görsel mesafeyi ise açıkça temsili olarak sıkıştırır.</sub>

</div>
