import type { MaterialNode, MaterialType, FormValues } from '../types/Material'
import { getNodeChildren, collectNodeIds } from './treeOperations'

const emptyFormValues: FormValues = {
  returnability: '',
  materialNumber: '',
  name: '',
  notes: '',
  unit: '',
  costPrice: '',
  price1: '',
  price2: '',
  price3: '',
  isNonStock: false,
}

export function getEmptyFormValues(): FormValues {
  return { ...emptyFormValues }
}

export function buildFormValues(node: MaterialNode | null): FormValues {
  if (!node) {
    return { ...emptyFormValues }
  }

  return {
    returnability: node.returnability ?? '',
    materialNumber: node.materialNumber,
    name: node.name,
    notes: node.notes ?? '',
    unit: node.unit ?? '',
    costPrice: node.costPrice ?? '',
    price1: node.price1 ?? '',
    price2: node.price2 ?? '',
    price3: node.price3 ?? '',
    isNonStock: node.isNonStock ?? false,
  }
}

export function buildNodeFromValues(
  type: MaterialType,
  values: FormValues
): MaterialNode {
  const base = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    materialNumber: values.materialNumber,
    name: values.name,
    notes: values.notes,
    children: [],
  }

  if (type === 'main') {
    return {
      ...base,
      returnability: values.returnability,
    } as MaterialNode
  }

  if (type === 'sub') {
    return {
      ...base,
      returnability: values.returnability,
      unit: values.unit,
      costPrice: values.costPrice,
      price1: values.price1,
      price2: values.price2,
      price3: values.price3,
      isNonStock: values.isNonStock,
    } as MaterialNode
  }

  return {
    ...base,
  } as MaterialNode
}

export function validateForm(
  values: FormValues,
  type: MaterialType,
  parentId: string,
  tree: MaterialNode[],
  currentNodeId?: string
): string[] {
  const errors: string[] = []

  if (type === 'main' || type === 'sub') {
    if (!values.returnability.trim()) {
      errors.push('يرجى إدخال عائدية المادة.')
    }
    if (!values.materialNumber.trim()) {
      errors.push('يرجى إدخال رقم المادة.')
    }
    if (!values.name.trim()) {
      errors.push('يرجى إدخال اسم المادة.')
    }
  } else if (!values.name.trim()) {
    errors.push('يرجى إدخال اسم المادة.')
  }

  if ((type === 'main' || type === 'sub') && values.materialNumber.trim()) {
    const allNodes = collectNodeIds(tree)
    const existingNumberNode = tree
      .flatMap((node) => [node, ...node.children])
      .find(
        (node) =>
          node.materialNumber === values.materialNumber.trim() &&
          node.id !== currentNodeId
      )
    if (existingNumberNode) {
      errors.push('رقم المادة موجود بالفعل.')
    }
  }

  if ((type === 'main' || type === 'sub') && values.name.trim()) {
    const siblings = getNodeChildren(tree, parentId)
    if (
      siblings.some(
        (node) =>
          node.name.trim() === values.name.trim() &&
          node.id !== currentNodeId
      )
    ) {
      errors.push('اسم المادة موجود بالفعل تحت نفس الأب.')
    }
  }

  if (type === 'sub') {
    if (!values.unit.trim()) {
      errors.push('يرجى إدخال الوحدة.')
    }
    if (!values.costPrice.trim()) {
      errors.push('يرجى إدخال سعر التكلفة.')
    }
  }

  return errors
}

export function getNodeLabel(type: MaterialType): string {
  switch (type) {
    case 'main':
      return 'مادة رئيسية'
    case 'sub':
      return 'مادة فرعية'
    default:
      return 'مادة'
  }
}
