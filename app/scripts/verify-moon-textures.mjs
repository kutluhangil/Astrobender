import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const EXPECTED_TEXTURES = {
  'callisto-4k.jpg': '733dce595eb97c83cae68862eb40409bf1dc3ffc9a797f0ec9ac2593de4cd794',
  'deimos-4k.jpg': '029fb9f0119b629f6b1ea717ea3ccb66067e7687b1f4608741aab0c4b37db6f2',
  'enceladus-4k.jpg': '5a4f2837826eb24e428ab6de09612d37eb6d7674be6f275782b6a0b5ff53522c',
  'europa-4k.jpg': 'd884c758bb2d219deab15fba4c227a4630ce1b21032212b34fb2f65eed0493a1',
  'ganymede-4k.jpg': 'f42f24c1ce0b4f06e762083a1191b31b284b72cd8751f2d8ab8bf46e2aea1884',
  'io-4k.jpg': '0de157956901d392a936777384e3b9e12cfdb5575ecdf010f4a0bd43e903e00f',
  'oberon-4k.jpg': 'ed29842e1b1fb96ee9626a62d4ee7bbf53756997ef33b1edda2dbead43383460',
  'phobos-4k.jpg': '181aeff41335f3028a7c4a0c2d829f9850b8293354f229b3ece107b3b2c885a2',
  'titan-4k.jpg': '38370ad8f39acae0f060bb2bef84ae1efe40144fb3fa098b502bbe376b8d2cd0',
  'titania-4k.jpg': 'cde4432380f44d2cda56c0059ae8ad44b7029bc930aefadf2cbac91379dd41e7',
  'triton-4k.jpg': '7dcd7950a4bf58869962f83dbb1c1e495ef9e04f44d6701165ad62d2be39866e',
}

const failures = []

for (const [fileName, expectedHash] of Object.entries(EXPECTED_TEXTURES)) {
  const fileUrl = new URL(`../public/textures/${fileName}`, import.meta.url)
  const data = await readFile(fileUrl)
  const actualHash = createHash('sha256').update(data).digest('hex')
  if (actualHash !== expectedHash) {
    failures.push(`${fileName}: expected ${expectedHash}, received ${actualHash}`)
  }
}

if (failures.length > 0) {
  throw new Error(`Moon texture verification failed:\n${failures.join('\n')}`)
}

console.log(`Verified ${Object.keys(EXPECTED_TEXTURES).length} official moon textures.`)
