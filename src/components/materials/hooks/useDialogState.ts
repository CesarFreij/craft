import { useState, useCallback } from 'react'
import type { MaterialNode, DialogState } from '../types/Material'

export function useDialogState() {
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    mode: 'add',
    title: '',
  })

  const openAddMainDialog = useCallback((parentId: string | null) => {
    setDialog({
      open: true,
      mode: 'add',
      title: 'إضافة مادة رئيسية',
      subtitle: 'أدخل بيانات المادة الجديدة',
      parentId: parentId || undefined,
      nodeType: 'main',
    })
  }, [])

  const openAddSubDialog = useCallback((parentId: string) => {
    setDialog({
      open: true,
      mode: 'add',
      title: 'إضافة مادة فرعية',
      subtitle: 'أدخل بيانات المادة الجديدة',
      parentId,
      nodeType: 'sub',
    })
  }, [])

  const openEditDialog = useCallback((node: MaterialNode) => {
    setDialog({
      open: true,
      mode: 'edit',
      title: 'تعديل المادة',
      subtitle: node.name,
      node,
      nodeType: node.type,
    })
  }, [])

  const closeDialog = useCallback(() => {
    setDialog({ open: false, mode: 'add', title: '' })
  }, [])

  const handleDialogConfirm = useCallback(
    (values: any, handlers: any) => {
      // Implement dialog confirm logic here
      closeDialog()
    },
    [closeDialog]
  )

  return {
    dialog,
    openAddMainDialog,
    openAddSubDialog,
    openEditDialog,
    closeDialog,
    handleDialogConfirm,
  }
}
