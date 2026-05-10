"use client";

import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  uploading?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}

export function ImageUpload({
  currentUrl,
  onUpload,
  uploading = false,
  label = "Logo",
  hint = "PNG, JPG o WEBP · máx. 5 MB",
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = preview ?? currentUrl ?? null;

  function validateAndUpload(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo no puede superar 5 MB");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    onUpload(file).catch((err: unknown) => {
      setPreview(null);
      const e = err as { message?: string };
      setError(e?.message ?? "Error al subir la imagen");
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndUpload(file);
  }

  function handleRemove() {
    setPreview(null);
    setError(null);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>

      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="relative h-20 w-20 shrink-0">
          {displayUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt="Logo preview"
                className="h-20 w-20 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700"
              />
              {!uploading && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-white shadow hover:bg-red-500 transition-colors"
                  title="Quitar imagen"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
              <ImageIcon className="h-6 w-6 text-neutral-400" />
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragOver
              ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
              : "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:border-indigo-400 hover:bg-primary/10/50 dark:hover:bg-primary/5",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <Upload className="mb-2 h-5 w-5 text-neutral-400" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Arrastra o <span className="text-primary dark:text-primary">elige archivo</span>
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">{hint}</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}


