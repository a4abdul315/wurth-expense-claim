"use client";

import { useEffect, useState } from "react";

type PreparedReceipt = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  originalSize: number;
  previewUrl: string | null;
  status: "ready" | "error";
  message: string;
};

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf"
]);

const maxFileSizeBytes = 10 * 1024 * 1024;
const maxImageDimension = 1800;
const jpegQuality = 0.78;

export interface ReceiptMeta { name: string; size: number; type: string; previewUrl: string | null; }

export function ReceiptUpload({ onChange }: { onChange?: (receipts: ReceiptMeta[]) => void } = {}) {
  const [files, setFiles] = useState<PreparedReceipt[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Notify parent whenever files change
  useEffect(() => {
    onChange?.(files.filter(f => f.status === "ready").map(f => ({
      name: f.name, size: f.size, type: f.mimeType, previewUrl: f.previewUrl,
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  async function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    setIsProcessing(true);
    const prepared = await Promise.all(Array.from(fileList).map(prepareReceipt));
    setFiles((current) => [...current, ...prepared]);
    setIsProcessing(false);
  }

  return (
    <section className="rounded border border-line bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Receipts</h2>
        <label className="focus-within:ring-brand-600 inline-flex h-12 cursor-pointer items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-slate-50 focus-within:ring-2 focus-within:ring-offset-2">
          Camera
          <input
            type="file"
            accept="image/*,.heic,.heif,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={(event) => addFiles(event.target.files)}
          />
        </label>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={`mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded border border-dashed px-4 py-6 text-center transition ${
          isDragging
            ? "border-brand-600 bg-brand-50"
            : "border-slate-300 bg-slate-50 hover:bg-white"
        }`}
      >
        <span className="text-sm font-semibold text-ink">Drop receipt files</span>
        <span className="mt-1 text-xs text-slate-500">
          Images, HEIC, or PDFs up to 10 MB
        </span>
        <input
          type="file"
          accept="image/*,.heic,.heif,application/pdf"
          multiple
          className="sr-only"
          onChange={(event) => addFiles(event.target.files)}
        />
      </label>

      {isProcessing ? (
        <div className="mt-3 rounded border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
          Preparing receipt files...
        </div>
      ) : null}

      {files.length > 0 ? (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded border border-line">
          {files.map((file) => (
            <li key={file.id} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-3 py-3">
              {file.previewUrl ? (
                <img
                  src={file.previewUrl}
                  alt=""
                  className="h-11 w-11 rounded border border-line object-cover"
                />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded border border-line bg-slate-50 text-xs font-bold text-slate-500">
                  PDF
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-700">
                  {file.name}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {formatBytes(file.size)}
                  {file.originalSize !== file.size
                    ? ` from ${formatBytes(file.originalSize)}`
                    : ""}
                </span>
              </span>
              <span
                className={`ml-3 shrink-0 text-xs font-semibold ${
                  file.status === "ready" ? "text-success" : "text-danger"
                }`}
              >
                {file.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

async function prepareReceipt(file: File): Promise<PreparedReceipt> {
  const baseReceipt = {
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    originalSize: file.size,
    previewUrl: null
  };

  if (!isAllowedFile(file)) {
    return {
      ...baseReceipt,
      status: "error",
      message: "Invalid type"
    };
  }

  if (file.size > maxFileSizeBytes) {
    return {
      ...baseReceipt,
      status: "error",
      message: "Too large"
    };
  }

  if (file.type === "application/pdf") {
    // Create blob URL so Finance can download the PDF (converted to base64 on submit)
    return {
      ...baseReceipt,
      previewUrl: URL.createObjectURL(file),
      status: "ready",
      message: "Ready"
    };
  }

  try {
    const normalizedFile = await convertHeicIfNeeded(file);
    const compressedFile = await compressImage(normalizedFile);

    return {
      ...baseReceipt,
      name: compressedFile.name,
      mimeType: compressedFile.type,
      size: compressedFile.size,
      previewUrl: URL.createObjectURL(compressedFile),
      status: "ready",
      message: "Ready"
    };
  } catch {
    return {
      ...baseReceipt,
      status: "error",
      message: "Failed"
    };
  }
}

function isAllowedFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    allowedMimeTypes.has(file.type) ||
    extension === "heic" ||
    extension === "heif" ||
    extension === "pdf"
  );
}

async function convertHeicIfNeeded(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    extension === "heic" ||
    extension === "heif";

  if (!isHeic) return file;

  const heic2any = (await import("heic2any")).default;
  const jpegBlob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: jpegQuality
  });
  const blob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob;

  return new File([blob], replaceExtension(file.name, "jpg"), {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

async function compressImage(file: File) {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, maxImageDimension / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare image");

  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Compression failed"))),
      "image/jpeg",
      jpegQuality
    );
  });

  return new File([blob], replaceExtension(file.name, "jpg"), {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

function replaceExtension(fileName: string, extension: string) {
  return fileName.replace(/\.[^.]+$/, `.${extension}`);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
