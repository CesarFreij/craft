import { initDatabase, createMaterial, createStockMovementDocument, listMaterials, deleteMaterial, listWarehouses, createWarehouse } from '../electron/materialsRepository.js'

async function run() {
  await initDatabase()

  // Helper to find material by id in current DB
  const exists = (id) => {
    const mats = listMaterials()
    return mats.some(m => m.id === id)
  }

  // TEST 1: create A->B->C with no movements and delete A
  const A = 'test-A-' + Date.now()
  const B = 'test-B-' + Date.now()
  const C = 'test-C-' + Date.now()

  try {
    // create A (main)
    await createMaterial({ id: A, type: 'main', parentId: null, returnability: '', materialNumber: 'A-num-' + Date.now(), name: 'A-test', unit: 'pcs' })
    // create B under A
    await createMaterial({ id: B, type: 'main', parentId: A, returnability: '', materialNumber: 'B-num-' + Date.now(), name: 'B-test', unit: 'pcs' })
    // create C under B
    await createMaterial({ id: C, type: 'sub', parentId: B, returnability: '', materialNumber: 'C-num-' + Date.now(), name: 'C-test', unit: 'pcs' })

    await deleteMaterial(A)

    const pass1 = !exists(A) && !exists(B) && !exists(C)
    console.log('DELETE TEST 1:', pass1 ? 'PASS' : 'FAIL')
  } catch (e) {
    console.error('DELETE TEST 1 ERROR', e)
  }

  // TEST 2: material with opening balance only
  const D = 'test-D-' + Date.now()
  try {
    // ensure warehouse exists for opening
    const whs2 = listWarehouses()
    let whId2 = whs2[0]?.id
    if (!whId2) {
      const w2 = await createWarehouse({ code: `WH-open-${Date.now()}`, name: 'Test WH Opening', location: '', notes: '' })
      whId2 = w2[0].id
    }

    // create sub material with opening balance
    await createMaterial({ id: D, type: 'sub', parentId: null, returnability: '', materialNumber: 'D-num-' + Date.now(), name: 'D-test', unit: 'pcs', openingBalance: 10, openingWarehouseId: whId2 })

    // Delete D
    await deleteMaterial(D)

    const pass2 = !exists(D)
    console.log('DELETE TEST 2:', pass2 ? 'PASS' : 'FAIL')
  } catch (e) {
    console.error('DELETE TEST 2 ERROR', e)
  }

  // TEST 3: material with a purchase movement should prevent deletion
  const E = 'test-E-' + Date.now()
  try {

    await createMaterial({ id: E, type: 'sub', parentId: null, returnability: '', materialNumber: 'E-num-' + Date.now(), name: 'E-test', unit: 'pcs' })

    // Ensure a warehouse exists for purchase
    const whs = listWarehouses()
    let whId = whs[0]?.id
    if (!whId) {
      const w = await createWarehouse({ code: `WH-${Date.now()}`, name: 'Test WH', location: '', notes: '' })
      whId = w[0].id
    }

    // Create a purchase movement document for E
    const reference = `mv-test-${Date.now()}`
    try {
      await createStockMovementDocument({ reference, type: 'purchase', toWarehouseId: whId, date: new Date().toISOString(), items: [{ materialId: E, quantity: 5 }] })
    } catch (err) {
      // ignore if validation fails
    }

    let prevented = false
    try {
      await deleteMaterial(E)
    } catch (err) {
      prevented = true
    }

    const pass3 = prevented && exists(E)
    console.log('DELETE TEST 3:', pass3 ? 'PASS' : 'FAIL')
  } catch (e) {
    console.error('DELETE TEST 3 ERROR', e)
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
