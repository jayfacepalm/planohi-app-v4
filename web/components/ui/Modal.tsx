import React from "react";
import { Button } from "./Button";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOutsideClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeOnOutsideClick = false
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      {/* Background shade lockout action */}
      <button
        type="button"
        className="absolute inset-0 w-full h-full cursor-default bg-transparent border-none"
        onClick={closeOnOutsideClick ? onClose : undefined}
        tabIndex={-1}
        aria-hidden="true"
      />
      
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-md rounded-2xl border border-neon-purple/35 bg-[#121214] shadow-[0_0_40px_rgba(168,85,247,0.25)] animate-in fade-in zoom-in duration-200 z-10"
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between rounded-t-2xl">
          <span id="modal-title" className="font-heading font-bold text-white text-lg tracking-wider">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer focus:outline-none focus:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex items-center justify-end gap-3 rounded-b-2xl">
          {footer || (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onClose}>
                Acknowledge
              </Button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
