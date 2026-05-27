"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, X, AlertTriangle } from "lucide-react";

interface UploadFileProps {
  onFileSelect?: (file: File | null) => void;
  accept?: string; // Comma-separated extensions, e.g., ".png,.jpg,.pdf"
  maxSizeMB?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const UploadFile: React.FC<UploadFileProps> = ({
  onFileSelect,
  accept = "",
  maxSizeMB = 5,
  label = "Upload file",
  className = "",
  disabled = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Validate file type and size
  const validateFile = (file: File): boolean => {
    setErrorMessage(null);

    // 1. Validate File Size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return false;
    }

    // 2. Validate File Extension
    if (accept) {
      const allowedExtensions = accept
        .split(",")
        .map((ext) => ext.trim().toLowerCase());
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      
      const isAllowed = allowedExtensions.some((ext) => {
        // Handle wildcards like image/*
        if (ext.endsWith("/*")) {
          const mimeTypeGroup = ext.replace("/*", "");
          return file.type.startsWith(mimeTypeGroup);
        }
        return ext === fileExtension || ext === file.type.toLowerCase();
      });

      if (!isAllowed) {
        setErrorMessage(`Invalid file type. Allowed formats: ${accept}`);
        return false;
      }
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    } else {
      setSelectedFile(null);
      if (onFileSelect) onFileSelect(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = "";
    if (onFileSelect) onFileSelect(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <span className="text-[10px] text-zinc-500 font-heading block uppercase tracking-wider mb-2">
          {label}
        </span>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onButtonClick();
          }
        }}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 bg-[#121214] cursor-pointer select-none outline-none transition-all duration-300
          ${dragActive 
            ? "border-neon-cyan bg-neon-cyan/5 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
            : "border-white/10 hover:border-neon-purple/40 hover:bg-white/[0.01]"
          }
          focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.25)]
          ${selectedFile ? "border-solid border-neon-purple/30" : ""}
          ${errorMessage ? "border-red-500/50 hover:border-red-500/70 focus:border-red-500" : ""}
          ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        {dragActive || !selectedFile ? (
          <div className="flex flex-col items-center justify-center text-center space-y-2 pointer-events-none">
            <div className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <span className="text-sm font-medium text-zinc-300">
                {dragActive ? "Drop file to replace" : (
                  <>Drag and drop or <span className="text-neon-cyan hover:underline">browse</span></>
                )}
              </span>
              <span className="text-xs text-zinc-500 block mt-1">
                {accept ? `Allowed: ${accept}` : "All formats allowed"} (Max {maxSizeMB}MB)
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-neon-purple/10 text-neon-purple rounded-lg shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={removeFile}
              className="p-1.5 rounded-lg border border-white/5 hover:border-red-500/40 text-zinc-400 hover:text-red-400 transition-all cursor-pointer focus:outline-none"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs text-red-400 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {errorMessage}
        </p>
      )}
    </div>
  );
};
