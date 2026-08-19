export interface Constellation {
  name: string
  nameTr: string
  points: [number, number, number][] // spherical coordinates mapped to 3D celestial sphere
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

/** Converts Right Ascension (hours 0..24) and Declination (deg -90..90) to 3D unit vector */
function radecToVec(raHours: number, decDeg: number, radius = 250): [number, number, number] {
  const raRad = (raHours / 24) * Math.PI * 2
  const decRad = (decDeg / 180) * Math.PI
  const x = Math.cos(decRad) * Math.cos(raRad) * radius
  const y = Math.cos(decRad) * Math.sin(raRad) * radius
  const z = Math.sin(decRad) * radius
  return [x, y, z]
}

export const CONSTELLATIONS: Constellation[] = [
  {
    name: 'Orion',
    nameTr: 'Avcı (Orion)',
    points: [
      radecToVec(5.92, 7.41), radecToVec(5.24, 6.35), // Betelgeuse to Bellatrix
      radecToVec(5.24, 6.35), radecToVec(5.6, -1.94), // Bellatrix to Belt
      radecToVec(5.6, -1.94), radecToVec(5.24, -8.2), // Belt to Rigel
      radecToVec(5.24, -8.2), radecToVec(5.92, 7.41), // Rigel to Betelgeuse
    ],
  },
  {
    name: 'Ursa Major',
    nameTr: 'Büyük Ayı (Ursa Major)',
    points: [
      radecToVec(11.06, 61.75), radecToVec(11.03, 56.38), // Dubhe to Merak
      radecToVec(11.03, 56.38), radecToVec(11.9, 53.69), // Merak to Phecda
      radecToVec(11.9, 53.69), radecToVec(12.25, 57.03), // Phecda to Megrez
      radecToVec(12.25, 57.03), radecToVec(12.9, 55.96), // Megrez to Alioth
      radecToVec(12.9, 55.96), radecToVec(13.4, 49.31), // Alioth to Mizar
      radecToVec(13.4, 49.31), radecToVec(13.79, 49.31), // Mizar to Alkaid
    ],
  },
  {
    name: 'Cassiopeia',
    nameTr: 'Kraliçe (Cassiopeia)',
    points: [
      radecToVec(0.15, 59.15), radecToVec(0.67, 56.54), // Schedar to Caph
      radecToVec(0.67, 56.54), radecToVec(0.94, 60.72), // Caph to Gamma Cas
      radecToVec(0.94, 60.72), radecToVec(1.43, 60.23), // Gamma Cas to Ruchbah
      radecToVec(1.43, 60.23), radecToVec(1.9, 63.67), // Ruchbah to Segin
    ],
  },
  {
    name: 'Scorpius',
    nameTr: 'Akrep (Scorpius)',
    points: [
      radecToVec(16.49, -26.43), radecToVec(16.09, -19.8), // Antares to Graffias
      radecToVec(16.49, -26.43), radecToVec(16.84, -34.29), // Antares to Wei
      radecToVec(16.84, -34.29), radecToVec(17.56, -37.0), // Wei to Shaula
    ],
  },
  {
    name: 'Cygnus',
    nameTr: 'Kuğu (Cygnus / Northern Cross)',
    points: [
      radecToVec(20.69, 45.28), radecToVec(20.37, 40.26), // Deneb to Sadr
      radecToVec(20.37, 40.26), radecToVec(19.51, 27.96), // Sadr to Albireo
      radecToVec(19.75, 45.13), radecToVec(20.37, 40.26), // Gienah to Sadr
      radecToVec(20.37, 40.26), radecToVec(21.31, 30.22), // Sadr to Delta Cyg
    ],
  },
]

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
