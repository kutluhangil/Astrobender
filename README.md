# ASTROBENDER

ASTROBENDER, Güneş Sistemi ile Dünya çevresindeki yapay uyduları aynı Three.js sahnesinde incelemek için geliştirilmiş etkileşimli bir web uygulamasıdır.

## Kapsam

- Güneş, sekiz gezegen ve Plüton
- Ay, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Enceladus, Titan, Titania, Oberon ve Triton
- CelesTrak TLE verileriyle SGP4 tabanlı yapay uydu konumları
- Gezegenler ve büyük uydular arasında sinematik kamera geçişleri
- Gezegen yarıçaplarını karşılaştıran Scale Sandbox
- Asteroit kuşağı, Kuiper kuşağı, derin uzay sondaları ve takımyıldız katmanları

## Konum ve ölçek modeli

Gezegen konumları, JPL Solar System Dynamics tarafından yayımlanan 1800–2050 aralığına yönelik yaklaşık Kepler elemanlarından hesaplanır. Büyük uyduların yörüngelerinde JPL J2000 ortalama elemanları kullanılır. Plüton için J2000 yaklaşık elemanları uygulanır.

Güneş merkezli mesafeler aynı monoton sıkıştırma eğrisinden geçirilir. Bu nedenle gezegenlerin sırası, birbirlerine göre yörünge yapısı ve gökyüzündeki yönleri korunurken milyarlarca kilometrelik gerçek ölçek tarayıcıda gezilebilir kalır. Arayüzde gösterilen AU değerleri görsel sahne yarıçapı değil, gerçek yarı-büyük eksen değerleridir. Uydu sistemleri de kendi içinde gerçek uzaklık oranlarını koruyan ayrı bir görsel ölçek kullanır.

Bazı dış uydu mozaikleri uzay görevlerinin görüntüleyebildiği alanlarla sınırlıdır. Bu kaplamalardaki siyah veya beyaz “veri yok” bölgeleri, sahnede uydunun ortalama albedosuna yakın nötr bir yüzeyle gösterilir; gözlemlenmemiş bölgelere sahte arazi detayı eklenmez.

Yapay uydu konumları paketlenmiş TLE görüntüsüyle hemen açılır; uygun olduğunda CelesTrak canlı verisi ve IndexedDB önbelleğiyle güncellenir. Canlı ağ veya önbellek hataları arayüzde nedenleriyle gösterilir.

## Teknoloji

- React 19
- TypeScript 5.9
- Vite 7
- Three.js 0.185
- satellite.js
- Tailwind CSS 3.4

## Yerel geliştirme

```bash
cd app
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## Doğrulama

```bash
cd app
npm test
npm run verify:textures
npm run lint
npm run build
npm audit --omit=dev
```

## Veri kaynakları

- [JPL yaklaşık gezegen konumları](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
- [JPL doğal uydu ortalama elemanları](https://ssd.jpl.nasa.gov/sats/elem/sep.html)
- [CelesTrak TLE verileri](https://celestrak.org/NORAD/elements/)
- [NASA Solar System Exploration](https://science.nasa.gov/solar-system/)
