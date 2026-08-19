import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const EXPECTED_TEXTURES = {
  'callisto-4k.jpg': '733dce595eb97c83cae68862eb40409bf1dc3ffc9a797f0ec9ac2593de4cd794',
  'deimos-4k.jpg': '029fb9f0119b629f6b1ea717ea3ccb66067e7687b1f4608741aab0c4b37db6f2',
  'enceladus-4k.jpg': '5a4f2837826eb24e428ab6de09612d37eb6d7674be6f275782b6a0b5ff53522c',
  'europa-4k.jpg': 'bd950316ffcb66b64e8b7acb22f2fd37a814d295063d84570169830986993f8c',
  'ganymede-4k.jpg': 'f42f24c1ce0b4f06e762083a1191b31b284b72cd8751f2d8ab8bf46e2aea1884',
  'io-4k.jpg': '0de157956901d392a936777384e3b9e12cfdb5575ecdf010f4a0bd43e903e00f',
  'oberon-4k.jpg': '2e11c4ec196c83923dca57bf596efd188acf554d1f13579a7241f54bfc91fffa',
  'phobos-4k.jpg': '181aeff41335f3028a7c4a0c2d829f9850b8293354f229b3ece107b3b2c885a2',
  'titan-4k.jpg': '38370ad8f39acae0f060bb2bef84ae1efe40144fb3fa098b502bbe376b8d2cd0',
  'titania-4k.jpg': 'bfbbc46184f27b74d6560e4413701b5b078f09abb94bf8bd94910be97494062c',
  'triton-4k.jpg': '7fa8d4d30de7ac2feb832a71f32d58fe394f4d73f05da1b424a65651d01954eb',
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

console.log(`Verified ${Object.keys(EXPECTED_TEXTURES).length} pinned moon texture assets.`)
