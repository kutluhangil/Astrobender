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
  'https://iauarchive.eso.org/public/themes/constellations/'

export const CONSTELLATIONS: readonly Constellation[] = Object.freeze([])

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
    renderedFigure: false,
    sourceUrl: IAU_CONSTELLATIONS_SOURCE_URL,
  }))
