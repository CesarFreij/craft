import { spawnSync } from 'node:child_process'
import { initDatabase, createWarehouse, listWarehouses, deleteWarehouse, createStockMovementDocument, createMaterial } from '../electron/materialsRepository.js'

async function run() {
  await initDatabase()

  const ensureClean = async (code) => {
    const existing = listWarehouses().find(w => w.code === code)
    if (existing) {
      try {
        await deleteWarehouse(existing.id)
      } catch {
        // ignore; if it cannot be deleted, leave it for failure handling below
      }
    }
  }

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`

  console.log('TEST 1: empty warehouse can be deleted')
  const code1 = `DELETE-01-${suffix}`
  await ensureClean(code1)
  const wh1 = await createWarehouse({ code: code1, name: 'مخزن اختبار الحذف', location: '', notes: '' })
  const wh1Record = wh1.find(w => w.code === code1)
  const wh1Id = wh1Record?.id
  let pass1 = false
  try {
    if (!wh1Id) {
      throw new Error(`Failed to resolve created warehouse ID for ${code1}`)
    }
    await deleteWarehouse(wh1Id)
    pass1 = !listWarehouses().some(w => w.code === code1)
  } catch (err) {
    console.error('TEST 1 ERROR', err)
  }
  console.log('DELETE TEST 1:', pass1 ? 'PASS' : 'FAIL')

  console.log('TEST 2: purchase movement should prevent deletion')
  const code2 = `DELETE-02-${suffix}`
  const wh2 = await createWarehouse({ code: code2, name: 'مخزن اختبار حركة شراء', location: '', notes: '' })
  const wh2Id = wh2.find(w => w.code === code2)?.id
  const mat2 = await createMaterial({ id: `mat-delete-02-${suffix}`, type: 'sub', parentId: null, returnability: '', materialNumber: `M-DELETE-02-${suffix}`, name: 'مادة اختبار حركة', unit: 'pcs' })
  try {
    if (!wh2Id) {
      throw new Error(`Failed to resolve created warehouse ID for ${code2}`)
    }
    await createStockMovementDocument({ reference: `PURCHASE-DELETE-02-${suffix}`, type: 'purchase', date: new Date().toISOString(), toWarehouseId: wh2Id, items: [{ materialId: mat2[0].id, quantity: 5 }] })
  } catch (err) {
    console.error('TEST 2 movement creation failed', err)
  }
  let pass2 = false
  try {
    await deleteWarehouse(wh2Id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    pass2 = message === 'لا يمكن حذف المخزن لأنه مرتبط بحركات أو أرصدة مخزنية.' && listWarehouses().some(w => w.id === wh2Id)
  }
  console.log('DELETE TEST 2:', pass2 ? 'PASS' : 'FAIL')

  console.log('TEST 3: warehouse with stock_levels should prevent deletion')
  const code3 = `DELETE-03-${suffix}`
  const wh3 = await createWarehouse({ code: code3, name: 'مخزن اختبار أرصدة', location: '', notes: '' })
  const wh3Id = wh3.find(w => w.code === code3)?.id
  const mat3 = await createMaterial({ id: `mat-delete-03-${suffix}`, type: 'sub', parentId: null, returnability: '', materialNumber: `M-DELETE-03-${suffix}`, name: 'مادة اختبار أرصدة', unit: 'pcs' })
  try {
    if (!wh3Id) {
      throw new Error(`Failed to resolve created warehouse ID for ${code3}`)
    }
    await createStockMovementDocument({ reference: `PURCHASE-DELETE-03-${suffix}`, type: 'purchase', date: new Date().toISOString(), toWarehouseId: wh3Id, items: [{ materialId: mat3[0].id, quantity: 3 }] })
  } catch (err) {
    console.error('TEST 3 movement creation failed', err)
  }
  let pass3 = false
  try {
    await deleteWarehouse(wh3Id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    pass3 = message === 'لا يمكن حذف المخزن لأنه مرتبط بحركات أو أرصدة مخزنية.' && listWarehouses().some(w => w.id === wh3Id)
  }
  console.log('DELETE TEST 3:', pass3 ? 'PASS' : 'FAIL')

  console.log('TEST 4: persistence after deletion')
  const result = spawnSync('npx', ['electron', 'scripts/check_warehouse_persistence.js', code1], { encoding: 'utf8' })
  const outputLines = (result.stdout ?? '').trim().split(/\r?\n/).filter(Boolean)
  const pass4 = outputLines[outputLines.length - 1] === 'ABSENT'
  console.log('DELETE TEST 4:', pass4 ? 'PASS' : 'FAIL')

  if (!pass1 || !pass2 || !pass3 || !pass4) {
    process.exit(1)
  }
}

run().then(() => {
  console.log('Warehouse delete tests completed')
  process.exit(0)
}).catch((error) => {
  console.error('Warehouse delete tests encountered an error', error)
  process.exit(1)
})
