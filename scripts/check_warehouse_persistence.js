import { initDatabase, listWarehouses } from '../electron/materialsRepository.js'

async function run() {
  await initDatabase()
  const code = process.argv[2]
  const exists = listWarehouses().some(w => w.code === code)
  console.log(exists ? 'PRESENT' : 'ABSENT')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
