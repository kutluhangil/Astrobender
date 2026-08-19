import type { CelestialBodyId } from './planets'

export interface LocalizedScienceText {
  tr: string
  en: string
}

export interface CelestialPhysicalProfile {
  /** Mass from JPL/NASA data; null means no reliable published mass is available. */
  mass: string | null
  /** Bulk density; null means it cannot be derived reliably from measured mass and volume. */
  density: string | null
  /** Surface gravity; null means a reliable value is not published for this irregular body. */
  gravity: string | null
  /** Representative temperature, not a global or seasonal average unless explicitly stated. */
  temperature: string
  chemistry: LocalizedScienceText
}

export const JPL_PHYSICAL_PARAMETERS_URL = 'https://ssd.jpl.nasa.gov/planets/phys_par.html'
export const JPL_SATELLITE_PARAMETERS_URL = 'https://ssd.jpl.nasa.gov/sats/phys_par/'

const UNKNOWN_PROFILE_VALUE: string | null = null

/**
 * Compact, cited physical profiles for every selectable body. Values are rounded
 * for a readable HUD; planets/dwarf planets use JPL physical parameters and
 * resolved satellites use JPL satellite physical parameters. A null is shown as
 * "no reliable measurement" rather than inventing precision for small moons.
 *
 * Asteroid and trans-Neptunian temperatures are radiative-equilibrium estimates
 * computed from the JPL SSD albedo and semi-major axis, not surface
 * measurements; masses come from the published GM where JPL lists one.
 */
export const CELESTIAL_PHYSICAL_PROFILES: Record<CelestialBodyId, CelestialPhysicalProfile> = {
  sun: {
    mass: '1.9885 × 10³⁰ kg', density: '1.408 g/cm³', gravity: '274 m/s²', temperature: '~5,500 °C',
    chemistry: { tr: 'Plazma: H ~%73, He ~%25; iz elementler.', en: 'Plasma: H ~73%, He ~25%; trace elements.' },
  },
  mercury: {
    mass: '3.3010 × 10²³ kg', density: '5.429 g/cm³', gravity: '3.70 m/s²', temperature: '−180 to +430 °C',
    chemistry: { tr: 'Silikat kabuk ve manto; büyük Fe–Ni çekirdek. Çok seyrek Na/K ekzosferi.', en: 'Silicate crust and mantle; large Fe–Ni core. Extremely thin Na/K exosphere.' },
  },
  venus: {
    mass: '4.8673 × 10²⁴ kg', density: '5.243 g/cm³', gravity: '8.87 m/s²', temperature: '~464 °C',
    chemistry: { tr: 'CO₂ ~%96.5, N₂ ~%3.5; sülfürik asit bulutları.', en: 'CO₂ ~96.5%, N₂ ~3.5%; sulfuric-acid clouds.' },
  },
  earth: {
    mass: '5.9722 × 10²⁴ kg', density: '5.513 g/cm³', gravity: '9.807 m/s²', temperature: '−89 to +57 °C',
    chemistry: { tr: 'N₂ %78.08, O₂ %20.95, Ar %0.93, CO₂ ~%0.04; silikat kaya ve sıvı su.', en: 'N₂ 78.08%, O₂ 20.95%, Ar 0.93%, CO₂ ~0.04%; silicate rock and liquid water.' },
  },
  moon: {
    mass: '7.342 × 10²² kg', density: '3.344 g/cm³', gravity: '1.624 m/s²', temperature: '−173 to +127 °C',
    chemistry: { tr: 'Anortozit kabuk, bazaltik maria ve kutuplarda su buzu.', en: 'Anorthositic crust, basaltic maria, and polar water ice.' },
  },
  mars: {
    mass: '6.4171 × 10²³ kg', density: '3.934 g/cm³', gravity: '3.71 m/s²', temperature: '~−63 °C',
    chemistry: { tr: 'CO₂ ~%95.3, N₂ ~%2.7, Ar ~%1.6; demir oksitli regolit.', en: 'CO₂ ~95.3%, N₂ ~2.7%, Ar ~1.6%; iron-oxide-rich regolith.' },
  },
  phobos: {
    mass: '1.066 × 10¹⁶ kg', density: '1.876 g/cm³', gravity: '0.0057 m/s²', temperature: '~−112 °C',
    chemistry: { tr: 'Koyu, karbonca zengin olabilecek gözenekli regolit; atmosfer saptanmadı.', en: 'Dark, porous regolith that may be carbon-rich; no detected atmosphere.' },
  },
  deimos: {
    mass: '1.476 × 10¹⁵ kg', density: '1.47 g/cm³', gravity: '0.0030 m/s²', temperature: '~−40 °C',
    chemistry: { tr: 'Koyu, ince regolitli düzensiz kaya; atmosfer saptanmadı.', en: 'Dark irregular rock with fine regolith; no detected atmosphere.' },
  },
  jupiter: {
    mass: '1.8981 × 10²⁷ kg', density: '1.326 g/cm³', gravity: '24.79 m/s²', temperature: '~−145 °C',
    chemistry: { tr: 'H₂ ~%89, He ~%10; CH₄, NH₃ ve H₂O izleri.', en: 'H₂ ~89%, He ~10%; traces of CH₄, NH₃, and H₂O.' },
  },
  io: {
    mass: '8.932 × 10²² kg', density: '3.528 g/cm³', gravity: '1.796 m/s²', temperature: '~−143 °C',
    chemistry: { tr: 'Silikat kaya, kükürt ve SO₂ donları; seyrek SO₂ atmosferi.', en: 'Silicate rock, sulfur, and SO₂ frost; tenuous SO₂ atmosphere.' },
  },
  europa: {
    mass: '4.800 × 10²² kg', density: '3.014 g/cm³', gravity: '1.315 m/s²', temperature: '~−160 °C',
    chemistry: { tr: 'H₂O buz kabuğu, tuzlar ve olası küresel tuzlu okyanus; ince O₂ ekzosferi.', en: 'H₂O ice shell, salts, and a possible global saline ocean; thin O₂ exosphere.' },
  },
  ganymede: {
    mass: '1.482 × 10²³ kg', density: '1.936 g/cm³', gravity: '1.428 m/s²', temperature: '~−163 °C',
    chemistry: { tr: 'Su buzu ve silikat kaya karışımı; çok ince O₂ ekzosferi.', en: 'Mixture of water ice and silicate rock; very thin O₂ exosphere.' },
  },
  callisto: {
    mass: '1.076 × 10²³ kg', density: '1.834 g/cm³', gravity: '1.235 m/s²', temperature: '~−139 °C',
    chemistry: { tr: 'Buz/kaya karışımı; çok ince CO₂, O₂ ve H₂ ekzosferi.', en: 'Ice-rock mixture; very thin CO₂, O₂, and H₂ exosphere.' },
  },
  amalthea: {
    mass: '2.08 × 10¹⁸ kg', density: '0.86 g/cm³', gravity: '0.020 m/s²', temperature: '~−153 °C',
    chemistry: { tr: 'Koyu kırmızımsı, çok gözenekli kaya/buz karışımı; atmosfer saptanmadı.', en: 'Dark reddish, highly porous rock-ice mixture; no detected atmosphere.' },
  },
  himalia: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−160 °C',
    chemistry: { tr: 'Koyu, karbonlu-kaya benzeri yüzey; atmosfer saptanmadı.', en: 'Dark carbonaceous-rock-like surface; no detected atmosphere.' },
  },
  saturn: {
    mass: '5.6834 × 10²⁶ kg', density: '0.687 g/cm³', gravity: '10.44 m/s²', temperature: '~−178 °C',
    chemistry: { tr: 'H₂ ~%96, He ~%3; CH₄, NH₃ ve H₂O izleri.', en: 'H₂ ~96%, He ~3%; traces of CH₄, NH₃, and H₂O.' },
  },
  pan: {
    mass: UNKNOWN_PROFILE_VALUE, density: '0.36 g/cm³ (yaklaşık)', gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−190 °C',
    chemistry: { tr: 'Gözenekli, su buzu bakımından zengin halka malzemesi; atmosfer saptanmadı.', en: 'Porous, water-ice-rich ring material; no detected atmosphere.' },
  },
  titan: {
    mass: '1.3452 × 10²³ kg', density: '1.881 g/cm³', gravity: '1.352 m/s²', temperature: '~−179 °C',
    chemistry: { tr: 'N₂ ~%98, CH₄ ~%1.4; su buzu kabuk ve metan/etan gölleri.', en: 'N₂ ~98%, CH₄ ~1.4%; water-ice crust and methane/ethane lakes.' },
  },
  enceladus: {
    mass: '1.080 × 10²⁰ kg', density: '1.610 g/cm³', gravity: '0.113 m/s²', temperature: '~−201 °C',
    chemistry: { tr: 'Su buzu, tuzlar ve organik bileşikler; H₂O buhar püskürmeleri.', en: 'Water ice, salts, and organic compounds; H₂O vapor plumes.' },
  },
  mimas: {
    mass: '3.749 × 10¹⁹ kg', density: '1.150 g/cm³', gravity: '0.064 m/s²', temperature: '~−205 °C',
    chemistry: { tr: 'Başlıca su buzu, az miktarda kaya; atmosfer saptanmadı.', en: 'Mostly water ice with a small rock fraction; no detected atmosphere.' },
  },
  tethys: {
    mass: '6.174 × 10²⁰ kg', density: '0.984 g/cm³', gravity: '0.145 m/s²', temperature: '~−187 °C',
    chemistry: { tr: 'Neredeyse tamamen su buzu; atmosfer saptanmadı.', en: 'Almost entirely water ice; no detected atmosphere.' },
  },
  dione: {
    mass: '1.095 × 10²¹ kg', density: '1.478 g/cm³', gravity: '0.232 m/s²', temperature: '~−186 °C',
    chemistry: { tr: 'Su buzu ve kaya; çok ince O₂/CO₂ ekzosferi olasılığı.', en: 'Water ice and rock; possible extremely thin O₂/CO₂ exosphere.' },
  },
  rhea: {
    mass: '2.307 × 10²¹ kg', density: '1.237 g/cm³', gravity: '0.264 m/s²', temperature: '~−174 °C',
    chemistry: { tr: 'Su buzu ağırlıklı, kaya katkılı yüzey; atmosfer saptanmadı.', en: 'Water-ice-dominated surface with rock contribution; no detected atmosphere.' },
  },
  iapetus: {
    mass: '1.806 × 10²¹ kg', density: '1.089 g/cm³', gravity: '0.223 m/s²', temperature: '~−180 °C',
    chemistry: { tr: 'Su buzu; koyu yarımkürede organikçe zengin toz birikimi.', en: 'Water ice; organic-rich dust deposits on the dark hemisphere.' },
  },
  hyperion: {
    mass: '5.62 × 10¹⁸ kg', density: '0.539 g/cm³', gravity: '0.020 m/s²', temperature: '~−180 °C',
    chemistry: { tr: 'Çok gözenekli su buzu/kaya karışımı; atmosfer saptanmadı.', en: 'Highly porous water-ice/rock mixture; no detected atmosphere.' },
  },
  uranus: {
    mass: '8.6810 × 10²⁵ kg', density: '1.270 g/cm³', gravity: '8.69 m/s²', temperature: '~−197 °C',
    chemistry: { tr: 'H₂ ~%83, He ~%15, CH₄ ~%2; derinde su-amonyak-metandan oluşan buz akışkanları.', en: 'H₂ ~83%, He ~15%, CH₄ ~2%; deep water-ammonia-methane icy fluids.' },
  },
  miranda: {
    mass: '6.59 × 10¹⁹ kg', density: '1.20 g/cm³', gravity: '0.079 m/s²', temperature: '~−187 °C',
    chemistry: { tr: 'Su buzu ve kaya karışımı; atmosfer saptanmadı.', en: 'Water-ice and rock mixture; no detected atmosphere.' },
  },
  ariel: {
    mass: '1.353 × 10²¹ kg', density: '1.66 g/cm³', gravity: '0.269 m/s²', temperature: '~−213 °C',
    chemistry: { tr: 'Su buzu, CO₂ buzu ve kaya; atmosfer saptanmadı.', en: 'Water ice, CO₂ ice, and rock; no detected atmosphere.' },
  },
  umbriel: {
    mass: '1.172 × 10²¹ kg', density: '1.46 g/cm³', gravity: '0.234 m/s²', temperature: '~−213 °C',
    chemistry: { tr: 'Koyu su buzu/kaya yüzeyi, olası CO₂ buzları; atmosfer saptanmadı.', en: 'Dark water-ice/rock surface with possible CO₂ ice; no detected atmosphere.' },
  },
  titania: {
    mass: '3.527 × 10²¹ kg', density: '1.71 g/cm³', gravity: '0.379 m/s²', temperature: '~−203 °C',
    chemistry: { tr: 'Su buzu ve kaya; CO₂ buzlarının işaretleri; atmosfer saptanmadı.', en: 'Water ice and rock with signs of CO₂ ice; no detected atmosphere.' },
  },
  oberon: {
    mass: '3.014 × 10²¹ kg', density: '1.63 g/cm³', gravity: '0.347 m/s²', temperature: '~−198 °C',
    chemistry: { tr: 'Su buzu ve kaya; koyu krater tabanları; atmosfer saptanmadı.', en: 'Water ice and rock with dark crater floors; no detected atmosphere.' },
  },
  neptune: {
    mass: '1.0241 × 10²⁶ kg', density: '1.638 g/cm³', gravity: '11.15 m/s²', temperature: '~−201 °C',
    chemistry: { tr: 'H₂ ~%80, He ~%19, CH₄ ~%1.5; derinde su-amonyak-metandan oluşan buz akışkanları.', en: 'H₂ ~80%, He ~19%, CH₄ ~1.5%; deep water-ammonia-methane icy fluids.' },
  },
  larissa: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−220 °C',
    chemistry: { tr: 'Koyu, düzensiz buz/kaya cismi; atmosfer saptanmadı.', en: 'Dark, irregular ice-rock body; no detected atmosphere.' },
  },
  proteus: {
    mass: '4.4 × 10¹⁹ kg', density: '~1.3 g/cm³', gravity: '~0.08 m/s²', temperature: '~−220 °C',
    chemistry: { tr: 'Koyu buz/kaya yüzeyi; atmosfer saptanmadı.', en: 'Dark ice-rock surface; no detected atmosphere.' },
  },
  nereid: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−220 °C',
    chemistry: { tr: 'Buz ve kaya karışımı olduğu düşünülür; atmosfer saptanmadı.', en: 'Thought to be an ice-rock mixture; no detected atmosphere.' },
  },
  triton: {
    mass: '2.140 × 10²² kg', density: '2.061 g/cm³', gravity: '0.779 m/s²', temperature: '~−235 °C',
    chemistry: { tr: 'N₂, CH₄ ve CO buzları; çok ince N₂ atmosferi.', en: 'N₂, CH₄, and CO ices; very thin N₂ atmosphere.' },
  },
  pluto: {
    mass: '1.303 × 10²² kg', density: '1.86 g/cm³', gravity: '0.62 m/s²', temperature: '~−229 °C',
    chemistry: { tr: 'N₂, CH₄ ve CO buzları; mevsimsel, çok ince N₂ atmosferi.', en: 'N₂, CH₄, and CO ices; seasonal, very thin N₂ atmosphere.' },
  },
  charon: {
    mass: '1.586 × 10²¹ kg', density: '1.70 g/cm³', gravity: '0.288 m/s²', temperature: '~−220 °C',
    chemistry: { tr: 'Su buzu, amonyak hidratları ve kaya; atmosfer saptanmadı.', en: 'Water ice, ammonia hydrates, and rock; no detected atmosphere.' },
  },
  styx: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−230 °C',
    chemistry: { tr: 'Küçük, düzensiz buzlu gövde; atmosfer saptanmadı.', en: 'Small irregular icy body; no detected atmosphere.' },
  },
  nix: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−230 °C',
    chemistry: { tr: 'Su buzu zengini düzensiz gövde; kırmızımsı bir krater alanı bulunur.', en: 'Water-ice-rich irregular body with a reddish crater region.' },
  },
  kerberos: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−230 °C',
    chemistry: { tr: 'Parlak, olası temas ikilisi; yüzey bileşimi sınırlı ölçüldü.', en: 'Bright possible contact binary; surface composition is only sparsely measured.' },
  },
  hydra: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−230 °C',
    chemistry: { tr: 'Su buzu zengini küçük düzensiz gövde; atmosfer saptanmadı.', en: 'Water-ice-rich small irregular body; no detected atmosphere.' },
  },
  ceres: {
    mass: '9.3835 × 10²⁰ kg', density: '2.162 g/cm³', gravity: '0.284 m/s²', temperature: '~−106 °C',
    chemistry: { tr: 'Su buzu, hidratlı mineraller ve karbonat tuzları; geçici su buharı izleri.', en: 'Water ice, hydrated minerals, and carbonate salts; transient water-vapor traces.' },
  },
  haumea: {
    mass: '4.006 × 10²¹ kg', density: '1.89 g/cm³', gravity: '~0.4 m/s²', temperature: '~−241 °C',
    chemistry: { tr: 'Kristalin su buzu ağırlıklı, hızla dönen uzamış cüce gezegen; halka içerir.', en: 'Crystalline-water-ice-rich, rapidly spinning elongated dwarf planet with a ring.' },
  },
  makemake: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−239 °C',
    chemistry: { tr: 'Metan ve etan buzları, karmaşık organik tholinler; küresel atmosfer saptanmadı.', en: 'Methane and ethane ices with complex organic tholins; no global atmosphere detected.' },
  },
  eris: {
    mass: '1.647 × 10²² kg', density: '2.52 g/cm³', gravity: '0.82 m/s²', temperature: '~−231 °C',
    chemistry: { tr: 'Metan buzu ve kaya; uzak konumda geçici atmosfer olasılığı araştırılıyor.', en: 'Methane ice and rock; a transient atmosphere at its distant location is being studied.' },
  },
  vesta: {
    mass: '2.590 × 10²⁰ kg', density: '3.46 g/cm³', gravity: '0.253 m/s²', temperature: '~−115 °C',
    chemistry: { tr: 'Bazaltik kabuk, olivince zengin manto ve demir çekirdek; HED göktaşlarının kaynağı.', en: 'Basaltic crust, olivine-rich mantle, and an iron core; the source of the HED meteorites.' },
  },
  pallas: {
    mass: '2.042 × 10²⁰ kg', density: '2.89 g/cm³', gravity: '0.207 m/s²', temperature: '~−113 °C',
    chemistry: { tr: 'Hidratlı silikatlar barındıran B tipi yüzey; atmosfer saptanmadı.', en: 'B-type surface carrying hydrated silicates; no detected atmosphere.' },
  },
  hygiea: {
    mass: '≈1.0 × 10²⁰ kg', density: UNKNOWN_PROFILE_VALUE, gravity: '0.169 m/s²', temperature: '~−119 °C',
    chemistry: { tr: 'Karbonca zengin C tipi yüzey; su bakımından işlenmiş mineraller içerdiği düşünülüyor.', en: 'Carbon-rich C-type surface thought to carry aqueously altered minerals.' },
  },
  juno: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−113 °C',
    chemistry: { tr: 'Taşsı S tipi yüzey; silikat ve demir-nikel karışımı. JPL yayımlanmış bir GM listelemiyor.', en: 'Stony S-type surface of silicates mixed with iron-nickel. JPL lists no published GM.' },
  },
  psyche: {
    mass: '2.399 × 10¹⁹ kg', density: '4.17 g/cm³', gravity: '0.130 m/s²', temperature: '~−115 °C',
    chemistry: { tr: 'Metalce zengin M tipi yüzey; demir-nikel ve silikat karışımı.', en: 'Metal-rich M-type surface mixing iron-nickel with silicates.' },
  },
  quaoar: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−232 °C',
    chemistry: { tr: 'Kristalin su buzu ve metan izleri; JPL yayımlanmış bir GM listelemiyor.', en: 'Crystalline water ice with methane traces; JPL lists no published GM.' },
  },
  gonggong: {
    mass: '1.75 × 10²¹ kg', density: '1.74 g/cm³', gravity: '0.31 m/s²', temperature: '~−240 °C',
    chemistry: { tr: 'Su buzu ve metan buzu; tholin kaynaklı kırmızımsı yüzey.', en: 'Water ice and methane ice with a reddish tholin-bearing surface.' },
  },
  sedna: {
    mass: UNKNOWN_PROFILE_VALUE, density: UNKNOWN_PROFILE_VALUE, gravity: UNKNOWN_PROFILE_VALUE, temperature: '~−246 °C',
    chemistry: { tr: 'Metan ve azot buzları ile tholinler; Güneş Sistemi’nin en kırmızı yüzeylerinden biri.', en: 'Methane and nitrogen ices with tholins; one of the reddest surfaces in the Solar System.' },
  },
}

export function physicalProfileValue(value: string | null, language: 'tr' | 'en'): string {
  if (value) return value
  return language === 'tr' ? 'Güvenilir ölçüm yok' : 'No reliable measurement'
}
