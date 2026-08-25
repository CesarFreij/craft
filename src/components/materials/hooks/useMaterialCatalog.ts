// import { useState, useCallback, useMemo } from 'react'
// import type { MaterialNode } from '../types/Material'
// import { findNodeById } from '../utils/treeOperations'

// const initialTree: MaterialNode[] = [
//   {
//     id: 'root',
//     type: 'main',
//     returnability: 'ممتازة',
//     materialNumber: 'ROOT-01',
//     name: 'المواد',
//     notes: 'الجذر الرئيسي للكتالوج',
//     children: [
//       {
//         id: 'main-1',
//         type: 'main',
//         returnability: 'ممتازة',
//         materialNumber: 'M-100',
//         name: 'مواد غذائية',
//         notes: 'مجموعة رئيسية',
//         children: [
//           {
//             id: 'main-2',
//             type: 'main',
//             returnability: 'مقبولة',
//             materialNumber: 'M-101',
//             name: 'حلويات',
//             notes: 'قسم الحلويات',
//             children: [
//               {
//                 id: 'sub-1',
//                 type: 'sub',
//                 isNonStock: false,
//                 returnability: 'عالية',
//                 materialNumber: 'S-200',
//                 name: 'شوكولا',
//                 unit: 'كجم',
//                 costPrice: '45',
//                 price1: '60',
//                 price2: '65',
//                 price3: '70',
//                 notes: 'مادة فرعية مثال',
//                 children: [],
//               },
//             ],
//           },
//         ],
//       },
//     ],
//   },
// ]

// export function useMaterialCatalog(selectedNodeId: string | null) {
//   const [materials, setMaterials] = useState<MaterialNode[]>(initialTree)

//   const selectedNode = useMemo(
//     () => (selectedNodeId ? findNodeById(materials, selectedNodeId) : null),
//     [selectedNodeId, materials]
//   )

//   const addMainMaterial = useCallback((parentId: string, node: MaterialNode) => {
//     // Implement add main material logic
//   }, [])

//   const addSubMaterial = useCallback((parentId: string, node: MaterialNode) => {
//     // Implement add sub material logic
//   }, [])

//   const updateMaterial = useCallback((nodeId: string, updates: Partial<MaterialNode>) => {
//     // Implement update material logic
//   }, [])

//   const deleteMaterial = useCallback((nodeId: string) => {
//     // Implement delete material logic
//   }, [])

//   return {
//     materials,
//     selectedNode,
//     addMainMaterial,
//     addSubMaterial,
//     updateMaterial,
//     deleteMaterial,
//   }
// }
