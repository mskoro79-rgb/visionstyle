import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, ImageOff } from "lucide-react";
import clsx from "clsx";

interface ImageUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onFileSelected, disabled }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);
      if (rejectedFiles.length > 0) {
        setError("Please upload a JPG, PNG, or WEBP image under 10MB.");
        return;
      }
      const file = acceptedFiles[0];
      if (!file) return;
      setPreview(URL.createObjectURL(file));
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    disabled,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={clsx(
          "glass-panel rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300",
          isDragActive ? "border-gilt-400 bg-gilt-500/5" : "border-white/15 hover:border-royal-500/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="Upload preview" className="mx-auto max-h-80 rounded-xl object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-royal-600 to-ember-500 flex items-center justify-center">
              <UploadCloud className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Drag & drop your photo here</p>
              <p className="text-white/50 text-sm mt-1">or click to browse — JPG, PNG, WEBP up to 10MB</p>
            </div>
            <p className="text-xs text-white/40 max-w-sm">
              For best results, use a well-lit, front-facing, full-body photo.
            </p>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-3 flex items-center gap-2 text-crimson-400 text-sm">
          <ImageOff className="h-4 w-4" /> {error}
        </p>
      )}
    </div>
  );
}
