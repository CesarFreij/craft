import { initDatabase, createWarehouse, createMaterial, listMaterials } from './materialsRepository.js'

async function run() {
  try {
    await initDatabase()
    console.log('DB initialized')

    const warehousePayload = {
      id: 'wh-debug-1',
      code: 'DBGWH',
      name: 'Debug Warehouse',
      location: 'Test',
      notes: 'Debug warehouse',
      status: 'active',
    }

    try {
      const warehouses = createWarehouse(warehousePayload)
      console.log('createWarehouse returned', warehouses.length)
    } catch (err) {
      console.error('createWarehouse error', err)
    }

    const payload = {
      id: 'sub-debug-1',
      type: 'sub',
      parentId: null,
      returnability: 'yes',
      materialNumber: 'DBG-001',
      name: 'DEBUG MATERIAL',
      openingBalance: 5,
      openingWarehouseId: 'wh-debug-1',
      unit: 'pcs',
      costPrice: '10',
      price1: '15',
      price2: '20',
      price3: '25',
      notes: 'debug entry',
      isNonStock: false,
    }

    try {
      const materials = createMaterial(payload)
      console.log('createMaterial returned material count', materials.length)
    } catch (err) {
      console.error('createMaterial error', err)
    }

    const all = listMaterials()
    console.log('listMaterials count', all.length)
    if (all.length > 0) console.log('first', all[0])
  } catch (err) {
    console.error('Unexpected error', err)
  }
}

run()
