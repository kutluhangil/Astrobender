import {
  CELESTIAL_SPHERE_RADIUS,
  hasDesignation,
  starIndexByDesignation,
  starPosition,
} from './star-catalog.ts'
import { BRIGHT_STARS } from './generated/bright-stars.ts'

export interface Constellation {
  name: string
  nameTr: string
  abbreviation: string
  /** Endpoint pairs on the celestial sphere, in scene units. */
  points: [number, number, number][]
}

export interface ConstellationCatalogEntry {
  name: string
  abbreviation: string
  englishName: string
  renderedFigure: boolean
  sourceUrl: string
}

export const IAU_CONSTELLATIONS_SOURCE_URL =
  'https://www.iau.org/Iau/Science/What-we-do/The-Constellations.aspx'

/**
 * Figures are written as chains of Bayer designations rather than as raw
 * coordinates, so every drawn line lands exactly on a star the scene also
 * paints. A designation may name another constellation ("Alp AND") for the
 * patterns that cross a boundary, such as the Great Square of Pegasus.
 *
 * The IAU fixes the 88 boundaries but publishes no official stick figures, so
 * these are conventional line patterns, and the interface says so.
 */
interface ConstellationFigure {
  name: string
  nameTr: string
  abbreviation: string
  chains: string[][]
}

const FIGURES: ConstellationFigure[] = [
  {
    name: 'Orion',
    nameTr: 'Avcı (Orion)',
    abbreviation: 'ORI',
    chains: [
      ['Bet', 'Del', 'Eps', 'Zet', 'Kap'],
      ['Del', 'Gam', 'Lam', 'Alp', 'Zet'],
    ],
  },
  {
    name: 'Ursa Major',
    nameTr: 'Büyük Ayı (Ursa Major)',
    abbreviation: 'UMA',
    chains: [
      ['Alp', 'Bet', 'Gam', 'Del', 'Alp'],
      ['Del', 'Eps', 'Zet', 'Eta'],
    ],
  },
  {
    name: 'Ursa Minor',
    nameTr: 'Küçük Ayı (Ursa Minor)',
    abbreviation: 'UMI',
    chains: [['Alp', 'Del', 'Eps', 'Zet', 'Bet', 'Gam', 'Eta', 'Zet']],
  },
  {
    name: 'Cassiopeia',
    nameTr: 'Kraliçe (Cassiopeia)',
    abbreviation: 'CAS',
    chains: [['Bet', 'Alp', 'Gam', 'Del', 'Eps']],
  },
  {
    name: 'Cygnus',
    nameTr: 'Kuğu (Cygnus)',
    abbreviation: 'CYG',
    chains: [
      ['Alp', 'Gam', 'Eta', 'Bet1'],
      ['Del', 'Gam', 'Eps'],
    ],
  },
  {
    name: 'Lyra',
    nameTr: 'Çalgı (Lyra)',
    abbreviation: 'LYR',
    chains: [['Alp', 'Zet1', 'Bet', 'Gam', 'Del2', 'Zet1']],
  },
  {
    name: 'Aquila',
    nameTr: 'Kartal (Aquila)',
    abbreviation: 'AQL',
    chains: [
      ['Bet', 'Alp', 'Gam', 'Del', 'Eta'],
      ['Gam', 'Zet', 'Eps'],
    ],
  },
  {
    name: 'Scorpius',
    nameTr: 'Akrep (Scorpius)',
    abbreviation: 'SCO',
    chains: [
      ['Bet1', 'Del', 'Pi'],
      ['Del', 'Sig', 'Alp', 'Tau', 'Eps', 'Mu1', 'Zet2', 'Eta', 'The', 'Iot1', 'Kap', 'Lam', 'Ups'],
    ],
  },
  {
    name: 'Leo',
    nameTr: 'Aslan (Leo)',
    abbreviation: 'LEO',
    chains: [
      ['Eps', 'Mu', 'Zet', 'Gam1', 'Eta', 'Alp'],
      ['Gam1', 'Del', 'Bet', 'The', 'Alp'],
      ['The', 'Del'],
    ],
  },
  {
    name: 'Taurus',
    nameTr: 'Boğa (Taurus)',
    abbreviation: 'TAU',
    chains: [
      ['Zet', 'Alp', 'The2', 'Gam', 'Lam', 'Xi'],
      ['Gam', 'Del1', 'Eps', 'Bet'],
    ],
  },
  {
    name: 'Gemini',
    nameTr: 'İkizler (Gemini)',
    abbreviation: 'GEM',
    chains: [
      ['Alp', 'Tau', 'Eps', 'Nu'],
      ['Bet', 'Del', 'Zet', 'Gam'],
      ['Tau', 'Del'],
      ['Eps', 'Mu', 'Eta'],
    ],
  },
  {
    name: 'Canis Major',
    nameTr: 'Büyük Köpek (Canis Major)',
    abbreviation: 'CMA',
    chains: [
      ['Bet', 'Alp', 'Del', 'Eta'],
      ['Del', 'Eps', 'Sig'],
      ['Alp', 'Iot', 'The'],
    ],
  },
  {
    name: 'Boötes',
    nameTr: 'Çoban (Boötes)',
    abbreviation: 'BOO',
    chains: [
      ['Alp', 'Eps', 'Del', 'Bet', 'Gam', 'Rho', 'Alp'],
      ['Gam', 'Eta', 'Alp'],
    ],
  },
  {
    name: 'Crux',
    nameTr: 'Güney Haçı (Crux)',
    abbreviation: 'CRU',
    chains: [
      ['Alp1', 'Gam'],
      ['Bet', 'Del'],
    ],
  },
  {
    name: 'Pegasus',
    nameTr: 'Kanatlı At (Pegasus)',
    abbreviation: 'PEG',
    chains: [
      ['Alp', 'Bet', 'Gam', 'Alp AND', 'Bet'],
      ['Alp', 'Gam'],
      ['Bet', 'Eta', 'Pi2'],
      ['Alp', 'The', 'Eps'],
    ],
  },
  {
    name: 'Andromeda',
    nameTr: 'Zincirli Prenses (Andromeda)',
    abbreviation: 'AND',
    chains: [
      ['Alp', 'Del', 'Bet', 'Gam1'],
      ['Del', 'Pi', 'Mu', 'Nu'],
    ],
  },
  {
    name: 'Perseus',
    nameTr: 'Kahraman (Perseus)',
    abbreviation: 'PER',
    chains: [
      ['Gam', 'Alp', 'Del', 'Eps', 'Zet'],
      ['Alp', 'Bet', 'Rho'],
      ['Alp', 'Kap', 'Bet'],
    ],
  },
  {
    name: 'Auriga',
    nameTr: 'Arabacı (Auriga)',
    abbreviation: 'AUR',
    chains: [['Alp', 'Bet', 'The', 'Iot', 'Eta', 'Alp']],
  },
  {
    name: 'Cepheus',
    nameTr: 'Kral (Cepheus)',
    abbreviation: 'CEP',
    chains: [
      ['Alp', 'Bet', 'Gam', 'Iot', 'Alp'],
      ['Bet', 'Del', 'Zet', 'Iot'],
    ],
  },
  {
    name: 'Draco',
    nameTr: 'Ejderha (Draco)',
    abbreviation: 'DRA',
    chains: [
      ['Lam', 'Kap', 'Alp', 'Iot', 'The', 'Eta', 'Zet', 'Phi', 'Del', 'Xi', 'Nu1', 'Bet', 'Gam', 'Xi'],
    ],
  },
  {
    name: 'Sagittarius',
    nameTr: 'Yay (Sagittarius)',
    abbreviation: 'SGR',
    chains: [
      ['Gam2', 'Del', 'Eps', 'Eta'],
      ['Del', 'Lam', 'Phi', 'Sig', 'Tau', 'Zet', 'Phi'],
      ['Lam', 'Mu'],
    ],
  },
  {
    name: 'Corona Borealis',
    nameTr: 'Kuzey Tacı (Corona Borealis)',
    abbreviation: 'CRB',
    chains: [['The', 'Bet', 'Alp', 'Gam', 'Del', 'Eps', 'Iot']],
  },
  {
    name: 'Hercules',
    nameTr: 'Herkül (Hercules)',
    abbreviation: 'HER',
    chains: [
      ['Bet', 'Zet', 'Eps', 'Pi', 'Eta', 'Zet'],
      ['Pi', 'Rho', 'The', 'Iot'],
      ['Eta', 'Sig', 'Tau', 'Phi'],
      ['Bet', 'Gam'],
      ['Bet', 'Alp1', 'Del'],
    ],
  },
  {
    name: 'Canis Minor',
    nameTr: 'Küçük Köpek (Canis Minor)',
    abbreviation: 'CMI',
    chains: [['Alp', 'Bet']],
  },
  {
    name: 'Aries',
    nameTr: 'Koç (Aries)',
    abbreviation: 'ARI',
    chains: [['Alp', 'Bet', 'Gam2']],
  },
  {
    name: 'Virgo',
    nameTr: 'Başak (Virgo)',
    abbreviation: 'VIR',
    chains: [
      ['Alp', 'Gam', 'Eta', 'Bet'],
      ['Gam', 'Del', 'Eps'],
      ['Alp', 'Zet', 'Del'],
    ],
  },
  {
    name: 'Corvus',
    nameTr: 'Karga (Corvus)',
    abbreviation: 'CRV',
    chains: [['Alp', 'Eps', 'Gam', 'Del', 'Bet', 'Eps']],
  },
  {
    name: 'Delphinus',
    nameTr: 'Yunus (Delphinus)',
    abbreviation: 'DEL',
    chains: [['Eps', 'Bet', 'Alp', 'Gam2', 'Del', 'Bet']],
  },
  {
    name: 'Cetus',
    nameTr: 'Balina (Cetus)',
    abbreviation: 'CET',
    chains: [
      ['Alp', 'Gam', 'Del', 'Omi', 'Zet', 'Tau', 'Bet', 'Iot', 'Eta', 'The', 'Zet'],
      ['Alp', 'Lam', 'Gam'],
    ],
  },
  {
    name: 'Centaurus',
    nameTr: 'Kentaur (Centaurus)',
    abbreviation: 'CEN',
    chains: [
      ['Alp1', 'Bet', 'Eps', 'Zet'],
      ['Eps', 'Gam', 'The'],
      ['Gam', 'Iot'],
    ],
  },
  {
    name: 'Carina',
    nameTr: 'Omurga (Carina)',
    abbreviation: 'CAR',
    chains: [['Alp', 'Bet', 'The', 'Iot', 'Eps']],
  },
  {
    name: 'Triangulum Australe',
    nameTr: 'Güney Üçgeni (Triangulum Australe)',
    abbreviation: 'TRA',
    chains: [['Alp', 'Bet', 'Gam', 'Alp']],
  },
  {
    name: 'Grus',
    nameTr: 'Turna (Grus)',
    abbreviation: 'GRU',
    chains: [['Gam', 'Lam', 'Alp', 'Bet', 'Eps', 'Zet']],
  },
  {
    name: 'Lupus',
    nameTr: 'Kurt (Lupus)',
    abbreviation: 'LUP',
    chains: [
      ['Alp', 'Bet', 'Del', 'Gam', 'Eta', 'Alp'],
      ['Bet', 'Pi', 'Alp'],
    ],
  },
  {
    name: 'Pavo',
    nameTr: 'Tavus Kuşu (Pavo)',
    abbreviation: 'PAV',
    chains: [['Alp', 'Bet', 'Del', 'Lam', 'Kap', 'Xi', 'Pi', 'Eta', 'Zet']],
  },
  {
    name: 'Ophiuchus',
    nameTr: 'Yılancı (Ophiuchus)',
    abbreviation: 'OPH',
    chains: [
      ['Alp', 'Kap', 'Lam', 'Del', 'Eps', 'Ups', 'Zet', 'Eta', 'Bet', 'Alp'],
      ['Eta', 'Zet'],
    ],
  },
  {
    name: 'Capricornus',
    nameTr: 'Oğlak (Capricornus)',
    abbreviation: 'CAP',
    chains: [['Alp2', 'Bet', 'Psi', 'Ome', 'Zet', 'Eps', 'Del', 'Gam', 'Iot', 'The', 'Alp2']],
  },
  {
    name: 'Piscis Austrinus',
    nameTr: 'Güney Balığı (Piscis Austrinus)',
    abbreviation: 'PSA',
    chains: [['Alp', 'Eps', 'Mu', 'The', 'Iot', 'Bet', 'Gam', 'Del', 'Alp']],
  },
  {
    name: 'Sagitta',
    nameTr: 'Ok (Sagitta)',
    abbreviation: 'SGE',
    chains: [['Alp', 'Del', 'Gam'], ['Bet', 'Del']],
  },
  {
    name: 'Lepus',
    nameTr: 'Tavşan (Lepus)',
    abbreviation: 'LEP',
    chains: [
      ['Kap', 'Mu', 'Lam'],
      ['Mu', 'Alp', 'Bet', 'Eps', 'Mu'],
      ['Alp', 'Zet', 'Eta'],
      ['Bet', 'Gam', 'Del'],
    ],
  },
  {
    name: 'Cancer',
    nameTr: 'Yengeç (Cancer)',
    abbreviation: 'CNC',
    chains: [
      ['Alp', 'Del', 'Gam'],
      ['Del', 'Bet'],
      ['Gam', 'Iot'],
    ],
  },
  {
    name: 'Libra',
    nameTr: 'Terazi (Libra)',
    abbreviation: 'LIB',
    chains: [
      ['Alp2', 'Bet', 'Gam', 'Alp2'],
      ['Bet', 'Sig'],
    ],
  },
  {
    name: 'Pisces',
    nameTr: 'Balıklar (Pisces)',
    abbreviation: 'PSC',
    chains: [
      ['Bet', 'Gam', 'The', 'Iot', 'Ome', 'Del', 'Eps', 'Zet', 'Mu', 'Nu', 'Alp'],
      ['Ome', 'Eta', 'Alp'],
    ],
  },
  {
    name: 'Aquarius',
    nameTr: 'Kova (Aquarius)',
    abbreviation: 'AQR',
    chains: [
      ['Eps', 'Bet', 'Alp', 'Gam', 'Zet1', 'Eta'],
      ['Gam', 'Pi', 'Zet1'],
      ['Alp', 'The', 'Lam', 'Del'],
    ],
  },
  {
    name: 'Eridanus',
    nameTr: 'Nehir (Eridanus)',
    abbreviation: 'ERI',
    chains: [
      ['Bet', 'Ome', 'Mu', 'Nu', 'Omi1', 'Gam', 'Pi', 'Del', 'Eps', 'Eta'],
    ],
  },
  {
    name: 'Columba',
    nameTr: 'Güvercin (Columba)',
    abbreviation: 'COL',
    chains: [['Eps', 'Alp', 'Bet', 'Gam', 'Eta'], ['Bet', 'Del']],
  },
  {
    name: 'Vela',
    nameTr: 'Yelkenler (Vela)',
    abbreviation: 'VEL',
    chains: [['Gam2', 'Del', 'Kap', 'Phi', 'Mu', 'Psi', 'Lam', 'Gam2']],
  },
  {
    name: 'Puppis',
    nameTr: 'Kıç (Puppis)',
    abbreviation: 'PUP',
    chains: [['Zet', 'Pi', 'Nu', 'Tau', 'Sig', 'Zet']],
  },
  { name: 'Antlia', nameTr: 'Hava Pompası (Antlia)', abbreviation: 'ANT', chains: [['Eps', 'Alp', 'Iot']] },
  { name: 'Apus', nameTr: 'Cennet Kuşu (Apus)', abbreviation: 'APS', chains: [['Alp', 'Del1', 'Bet', 'Gam', 'Del1']] },
  { name: 'Ara', nameTr: 'Sunak (Ara)', abbreviation: 'ARA', chains: [['Alp', 'Bet', 'Gam', 'Del'], ['Alp', 'Eps1', 'Zet', 'Eta']] },
  { name: 'Caelum', nameTr: 'Kalem (Caelum)', abbreviation: 'CAE', chains: [['Gam1', 'Bet', 'Alp', 'Del']] },
  { name: 'Camelopardalis', nameTr: 'Zürafa (Camelopardalis)', abbreviation: 'CAM', chains: [['Bet', 'Alp', 'Gam']] },
  { name: 'Canes Venatici', nameTr: 'Av Köpekleri (Canes Venatici)', abbreviation: 'CVN', chains: [['Alp2', 'Bet']] },
  { name: 'Chamaeleon', nameTr: 'Bukalemun (Chamaeleon)', abbreviation: 'CHA', chains: [['Alp', 'Gam', 'Bet', 'Del2', 'Gam']] },
  { name: 'Circinus', nameTr: 'Pergel (Circinus)', abbreviation: 'CIR', chains: [['Bet', 'Alp', 'Gam']] },
  { name: 'Coma Berenices', nameTr: 'Berenike’nin Saçı (Coma Berenices)', abbreviation: 'COM', chains: [['Alp', 'Bet', 'Gam']] },
  { name: 'Corona Australis', nameTr: 'Güney Tacı (Corona Australis)', abbreviation: 'CRA', chains: [['Gam', 'Alp', 'Bet', 'Del', 'The']] },
  { name: 'Crater', nameTr: 'Kadeh (Crater)', abbreviation: 'CRT', chains: [['Alp', 'Bet', 'Gam', 'Del', 'Alp'], ['Gam', 'Zet', 'Eta'], ['Del', 'Eps', 'The']] },
  { name: 'Dorado', nameTr: 'Kılıç Balığı (Dorado)', abbreviation: 'DOR', chains: [['Gam', 'Alp', 'Bet', 'Del']] },
  { name: 'Equuleus', nameTr: 'Küçük At (Equuleus)', abbreviation: 'EQU', chains: [['Alp', 'Del', 'Gam']] },
  { name: 'Fornax', nameTr: 'Ocak (Fornax)', abbreviation: 'FOR', chains: [['Alp', 'Bet', 'Nu']] },
  { name: 'Horologium', nameTr: 'Sarkaçlı Saat (Horologium)', abbreviation: 'HOR', chains: [['Alp', 'Iot', 'Eta', 'Zet', 'Mu', 'Bet']] },
  { name: 'Hydra', nameTr: 'Dişi Su Yılanı (Hydra)', abbreviation: 'HYA', chains: [['Sig', 'Eta', 'Del', 'Eps', 'Zet', 'The', 'Iot', 'Alp', 'Ups1', 'Lam', 'Mu', 'Nu', 'Bet', 'Xi', 'Gam', 'Pi']] },
  { name: 'Hydrus', nameTr: 'Erkek Su Yılanı (Hydrus)', abbreviation: 'HYI', chains: [['Alp', 'Bet', 'Gam', 'Alp']] },
  { name: 'Indus', nameTr: 'Yerli (Indus)', abbreviation: 'IND', chains: [['Alp', 'Bet', 'Del', 'The', 'Alp']] },
  { name: 'Lacerta', nameTr: 'Kertenkele (Lacerta)', abbreviation: 'LAC', chains: [['Alp', 'Bet', 'Alp', '5']] },
  { name: 'Leo Minor', nameTr: 'Küçük Aslan (Leo Minor)', abbreviation: 'LMI', chains: [['Bet', '46', '21', '10']] },
  { name: 'Lynx', nameTr: 'Vaşak (Lynx)', abbreviation: 'LYN', chains: [['Alp', '38', '31', '21', '15', '2']] },
  { name: 'Mensa', nameTr: 'Masa Dağı (Mensa)', abbreviation: 'MEN', chains: [['Alp', 'Gam', 'Eta', 'Bet']] },
  { name: 'Microscopium', nameTr: 'Mikroskop (Microscopium)', abbreviation: 'MIC', chains: [['Gam', 'Eps', 'The1', 'Alp', 'Gam']] },
  { name: 'Monoceros', nameTr: 'Tek Boynuz (Monoceros)', abbreviation: 'MON', chains: [['Zet', 'Alp', 'Del', 'Bet', 'Gam'], ['Del', 'Eps', '13']] },
  { name: 'Musca', nameTr: 'Sinek (Musca)', abbreviation: 'MUS', chains: [['Lam', 'Eps', 'Alp', 'Bet'], ['Alp', 'Gam'], ['Alp', 'Del']] },
  { name: 'Norma', nameTr: 'Gönye (Norma)', abbreviation: 'NOR', chains: [['Gam2', 'Eps', 'Del', 'Eta', 'Gam2']] },
  { name: 'Octans', nameTr: 'Oktant (Octans)', abbreviation: 'OCT', chains: [['Nu', 'Bet', 'Del', 'Nu']] },
  { name: 'Phoenix', nameTr: 'Anka (Phoenix)', abbreviation: 'PHE', chains: [['Alp', 'Eps', 'Bet', 'Gam', 'Del', 'Bet'], ['Alp', 'Bet']] },
  { name: 'Pictor', nameTr: 'Ressam Sehpası (Pictor)', abbreviation: 'PIC', chains: [['Alp', 'Bet', 'Gam']] },
  { name: 'Pyxis', nameTr: 'Pusula (Pyxis)', abbreviation: 'PYX', chains: [['Bet', 'Alp', 'Gam']] },
  { name: 'Reticulum', nameTr: 'Ağ (Reticulum)', abbreviation: 'RET', chains: [['Alp', 'Bet', 'Del', 'Eps', 'Alp']] },
  { name: 'Sculptor', nameTr: 'Heykeltıraş (Sculptor)', abbreviation: 'SCL', chains: [['Alp', 'Del', 'Gam', 'Bet']] },
  { name: 'Scutum', nameTr: 'Kalkan (Scutum)', abbreviation: 'SCT', chains: [['Alp', 'Bet', 'Del', 'Gam', 'Alp']] },
  { name: 'Serpens', nameTr: 'Yılan (Serpens)', abbreviation: 'SER', chains: [['Bet', 'Del', 'Alp', 'Eps', 'Mu'], ['Bet', 'Kap', 'Gam', 'Bet'], ['Nu', 'Xi', 'Eta', 'The1']] },
  { name: 'Sextans', nameTr: 'Sekstant (Sextans)', abbreviation: 'SEX', chains: [['Alp', 'Gam', 'Bet']] },
  { name: 'Telescopium', nameTr: 'Teleskop (Telescopium)', abbreviation: 'TEL', chains: [['Alp', 'Zet', 'Eps']] },
  { name: 'Triangulum', nameTr: 'Üçgen (Triangulum)', abbreviation: 'TRI', chains: [['Alp', 'Bet', 'Gam', 'Alp']] },
  { name: 'Tucana', nameTr: 'Tukan (Tucana)', abbreviation: 'TUC', chains: [['Alp', 'Gam', 'Bet1', 'Zet', 'Eps', 'Alp']] },
  { name: 'Volans', nameTr: 'Uçan Balık (Volans)', abbreviation: 'VOL', chains: [['Alp', 'Bet', 'Eps', 'Del', 'Gam2', 'Eps'], ['Gam2', 'Zet']] },
  { name: 'Vulpecula', nameTr: 'Tilki (Vulpecula)', abbreviation: 'VUL', chains: [['Alp', '13', '15']] },
]

function qualify(designation: string, abbreviation: string): string {
  return designation.includes(' ') ? designation : `${designation} ${abbreviation}`
}

/**
 * Resolves every figure at once so an authoring mistake reports the whole list
 * of unknown designations instead of stopping at the first one.
 */
function buildFigures(figures: ConstellationFigure[]): Constellation[] {
  const missing: string[] = []
  const built = figures.map((figure) => {
    const points: [number, number, number][] = []
    for (const chain of figure.chains) {
      if (chain.length < 2) {
        throw new Error(`Constellation ${figure.abbreviation} has a chain shorter than two stars`)
      }
      for (let step = 0; step < chain.length - 1; step++) {
        for (const designation of [chain[step], chain[step + 1]]) {
          const qualified = qualify(designation, figure.abbreviation)
          if (!hasDesignation(qualified)) {
            missing.push(qualified)
            continue
          }
          const position = starPosition(
            starIndexByDesignation(qualified),
            CELESTIAL_SPHERE_RADIUS,
          )
          points.push([position.x, position.y, position.z])
        }
      }
    }
    return {
      name: figure.name,
      nameTr: figure.nameTr,
      abbreviation: figure.abbreviation,
      points,
    }
  })

  if (missing.length > 0) {
    throw new Error(
      `Constellation figures reference stars the catalogue does not carry: ${[...new Set(missing)].join(', ')}`,
    )
  }
  return built
}

export const CONSTELLATIONS: Constellation[] = buildFigures(FIGURES)

/** Distinct catalogue stars every drawn figure touches. */
export const CONSTELLATION_FIGURE_STAR_COUNT = new Set(
  FIGURES.flatMap((figure) =>
    figure.chains.flatMap((chain) =>
      chain.map((designation) => qualify(designation, figure.abbreviation)),
    ),
  ),
).size

export const BRIGHT_STAR_CATALOG_SOURCE_URL = BRIGHT_STARS.sourceUrl

const FIGURE_NAMES = new Set(CONSTELLATIONS.map((constellation) => constellation.name))

const IAU_CONSTELLATION_ROWS: Array<[string, string, string]> = [
  ['Andromeda', 'And', 'The Chained Maiden'],
  ['Antlia', 'Ant', 'The Air Pump'],
  ['Apus', 'Aps', 'The Bird of Paradise'],
  ['Aquarius', 'Aqr', 'The Water Bearer'],
  ['Aquila', 'Aql', 'The Eagle'],
  ['Ara', 'Ara', 'The Altar'],
  ['Aries', 'Ari', 'The Ram'],
  ['Auriga', 'Aur', 'The Charioteer'],
  ['Boötes', 'Boo', 'The Herdsman'],
  ['Caelum', 'Cae', 'The Engraving Tool'],
  ['Camelopardalis', 'Cam', 'The Giraffe'],
  ['Cancer', 'Cnc', 'The Crab'],
  ['Canes Venatici', 'CVn', 'The Hunting Dogs'],
  ['Canis Major', 'CMa', 'The Great Dog'],
  ['Canis Minor', 'CMi', 'The Lesser Dog'],
  ['Capricornus', 'Cap', 'The Sea Goat'],
  ['Carina', 'Car', 'The Keel'],
  ['Cassiopeia', 'Cas', 'The Seated Queen'],
  ['Centaurus', 'Cen', 'The Centaur'],
  ['Cepheus', 'Cep', 'The King'],
  ['Cetus', 'Cet', 'The Sea Monster'],
  ['Chamaeleon', 'Cha', 'The Chameleon'],
  ['Circinus', 'Cir', 'The Drawing Compass'],
  ['Columba', 'Col', 'The Dove'],
  ['Coma Berenices', 'Com', "Berenice's Hair"],
  ['Corona Australis', 'CrA', 'The Southern Crown'],
  ['Corona Borealis', 'CrB', 'The Northern Crown'],
  ['Corvus', 'Crv', 'The Crow'],
  ['Crater', 'Crt', 'The Cup'],
  ['Crux', 'Cru', 'The Southern Cross'],
  ['Cygnus', 'Cyg', 'The Swan'],
  ['Delphinus', 'Del', 'The Dolphin'],
  ['Dorado', 'Dor', 'The Swordfish'],
  ['Draco', 'Dra', 'The Dragon'],
  ['Equuleus', 'Equ', 'The Little Horse'],
  ['Eridanus', 'Eri', 'The River'],
  ['Fornax', 'For', 'The Furnace'],
  ['Gemini', 'Gem', 'The Twins'],
  ['Grus', 'Gru', 'The Crane'],
  ['Hercules', 'Her', 'Hercules'],
  ['Horologium', 'Hor', 'The Clock'],
  ['Hydra', 'Hya', 'The Female Water Snake'],
  ['Hydrus', 'Hyi', 'The Male Water Snake'],
  ['Indus', 'Ind', 'The Indian'],
  ['Lacerta', 'Lac', 'The Lizard'],
  ['Leo', 'Leo', 'The Lion'],
  ['Leo Minor', 'LMi', 'The Lesser Lion'],
  ['Lepus', 'Lep', 'The Hare'],
  ['Libra', 'Lib', 'The Scales'],
  ['Lupus', 'Lup', 'The Wolf'],
  ['Lynx', 'Lyn', 'The Lynx'],
  ['Lyra', 'Lyr', 'The Lyre'],
  ['Mensa', 'Men', 'The Table Mountain'],
  ['Microscopium', 'Mic', 'The Microscope'],
  ['Monoceros', 'Mon', 'The Unicorn'],
  ['Musca', 'Mus', 'The Fly'],
  ['Norma', 'Nor', "The Carpenter's Square"],
  ['Octans', 'Oct', 'The Octant'],
  ['Ophiuchus', 'Oph', 'The Serpent Bearer'],
  ['Orion', 'Ori', 'The Hunter'],
  ['Pavo', 'Pav', 'The Peacock'],
  ['Pegasus', 'Peg', 'The Winged Horse'],
  ['Perseus', 'Per', 'The Hero'],
  ['Phoenix', 'Phe', 'The Phoenix'],
  ['Pictor', 'Pic', "The Painter's Easel"],
  ['Pisces', 'Psc', 'The Fishes'],
  ['Piscis Austrinus', 'PsA', 'The Southern Fish'],
  ['Puppis', 'Pup', 'The Stern'],
  ['Pyxis', 'Pyx', "The Mariner's Compass"],
  ['Reticulum', 'Ret', 'The Reticle'],
  ['Sagitta', 'Sge', 'The Arrow'],
  ['Sagittarius', 'Sgr', 'The Archer'],
  ['Scorpius', 'Sco', 'The Scorpion'],
  ['Sculptor', 'Scl', 'The Sculptor'],
  ['Scutum', 'Sct', 'The Shield'],
  ['Serpens', 'Ser', 'The Serpent'],
  ['Sextans', 'Sex', 'The Sextant'],
  ['Taurus', 'Tau', 'The Bull'],
  ['Telescopium', 'Tel', 'The Telescope'],
  ['Triangulum', 'Tri', 'The Triangle'],
  ['Triangulum Australe', 'TrA', 'The Southern Triangle'],
  ['Tucana', 'Tuc', 'The Toucan'],
  ['Ursa Major', 'UMa', 'The Great Bear'],
  ['Ursa Minor', 'UMi', 'The Little Bear'],
  ['Vela', 'Vel', 'The Sails'],
  ['Virgo', 'Vir', 'The Maiden'],
  ['Volans', 'Vol', 'The Flying Fish'],
  ['Vulpecula', 'Vul', 'The Fox'],
]

export const IAU_CONSTELLATIONS: ConstellationCatalogEntry[] =
  IAU_CONSTELLATION_ROWS.map(([name, abbreviation, englishName]) => ({
    name,
    abbreviation,
    englishName,
    renderedFigure: FIGURE_NAMES.has(name),
    sourceUrl: IAU_CONSTELLATIONS_SOURCE_URL,
  }))
