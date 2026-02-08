import { useState } from "react";

export function useBulkOperations<T extends { id: string }>() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = (items: T[]) => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const isSelected = (id: string) => selectedItems.has(id);

  const isAllSelected = (items: T[]) => 
    items.length > 0 && selectedItems.size === items.length;

  return {
    selectedItems,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
  };
}
