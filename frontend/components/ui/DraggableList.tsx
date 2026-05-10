"use client";

import { useState, useRef, useCallback, ReactNode } from "react";
import { GripVertical } from "lucide-react";

export interface DraggableListProps<T> {
  items: T[];
  onChange: (newItems: T[]) => void;
  renderItem: (item: T, isDragging: boolean) => ReactNode;
  className?: string;
  itemClassName?: string;
}

export default function DraggableList<T extends { id: string }>({
  items,
  onChange,
  renderItem,
  className = "",
  itemClassName = "",
}: DraggableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNode = useRef<EventTarget | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragNode.current = e.currentTarget;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    requestAnimationFrame(() => setDragIndex(index));
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (index !== dragIndex) setOverIndex(index);
  }, [dragIndex]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, items, onChange]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  return (
    <div className={className}>
      {items.map((item, index) => {
        const isDragging = dragIndex === index;
        const isOver = overIndex === index && dragIndex !== index;

        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={[
              "flex items-center gap-2 transition-all select-none",
              isDragging ? "opacity-40 scale-95" : "opacity-100",
              isOver
                ? "border-t-2 border-primary"
                : "border-t-2 border-transparent",
              itemClassName,
            ].join(" ")}
          >
            <span
              className="flex-shrink-0 cursor-grab active:cursor-grabbing text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors"
              title="Arrastra para reordenar"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              {renderItem(item, isDragging)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

