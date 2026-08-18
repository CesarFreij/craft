import type { MaterialNode } from '../types/Material'

export function cloneNode(node: MaterialNode): MaterialNode {
  return {
    ...node,
    children: node.children.map(cloneNode),
  }
}

export function findNodeById(
  nodes: MaterialNode[],
  id: string
): MaterialNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    const child = findNodeById(node.children, id)
    if (child) {
      return child
    }
  }
  return null
}

export function collectNodeIds(nodes: MaterialNode[]): string[] {
  return nodes.flatMap((node) => [
    node.id,
    ...collectNodeIds(node.children),
  ])
}

export function updateNodeInTree(
  nodes: MaterialNode[],
  targetId: string,
  updater: (node: MaterialNode) => MaterialNode
): MaterialNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return updater(node)
    }
    if (node.children.length) {
      return {
        ...node,
        children: updateNodeInTree(node.children, targetId, updater),
      }
    }
    return node
  })
}

export function addChildToParent(
  nodes: MaterialNode[],
  parentId: string,
  child: MaterialNode
): MaterialNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...node.children, child],
      }
    }
    if (node.children.length) {
      return {
        ...node,
        children: addChildToParent(node.children, parentId, child),
      }
    }
    return node
  })
}

export function removeNodeFromTree(
  nodes: MaterialNode[],
  targetId: string
): MaterialNode[] {
  return nodes.reduce<MaterialNode[]>((acc, node) => {
    if (node.id === targetId) {
      return acc
    }
    acc.push({
      ...node,
      children: removeNodeFromTree(node.children, targetId),
    })
    return acc
  }, [])
}

export function getNodeChildren(
  nodes: MaterialNode[],
  parentId: string
): MaterialNode[] {
  const parent = findNodeById(nodes, parentId)
  return parent?.children ?? []
}

export function canAcceptChildren(node: MaterialNode | null): boolean {
  if (!node) {
    return true
  }
  return node.type === 'main'
}
