"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { DateRangePicker } from "../ui/DateRangePicker";
import { Image as ImageIcon } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

const editEventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(255, "Title is too long"),
  description: z.string().optional(),
});

type EditEventFields = z.infer<typeof editEventSchema>;

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    bannerUrl?: string;
    currency?: string;
  };
  onSuccess: () => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom states for date picker & banner upload
  const [fromDate, setFromDate] = useState<Date | null>(event ? new Date(event.startDate) : null);
  const [toDate, setToDate] = useState<Date | null>(event ? new Date(event.endDate) : null);
  const [dateError, setDateError] = useState<string | null>(null);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [showUploadUI, setShowUploadUI] = useState(false);

  // Currency Selection States
  const [currencyMode, setCurrencyMode] = useState<"PREDEFINED" | "CUSTOM">("PREDEFINED");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [customCurrency, setCustomCurrency] = useState("");
  const [currencyError, setCurrencyError] = useState<string | null>(null);

  // Warning Modal States
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [pendingCurrencyMode, setPendingCurrencyMode] = useState<"PREDEFINED" | "CUSTOM" | null>(null);

  // Sync state if event prop changes
  useEffect(() => {
    if (event) {
      setFromDate(new Date(event.startDate));
      setToDate(new Date(event.endDate));
      setBannerFile(null);
      setBannerPreview(null);
      setBannerError(null);
      setShowUploadUI(false);
      setError(null);
      setDateError(null);

      // Initialize Currency States
      const isPredefined = ["USD", "PHP", "EUR", "GBP", "JPY", "SGD"].includes(event.currency || "USD");
      if (isPredefined) {
        setCurrencyMode("PREDEFINED");
        setSelectedCurrency(event.currency || "USD");
        setCustomCurrency("");
      } else {
        setCurrencyMode("CUSTOM");
        setSelectedCurrency("USD");
        setCustomCurrency(event.currency || "");
      }
      setCurrencyError(null);
      setShowWarningModal(false);
      setPendingCurrency(null);
      setPendingCurrencyMode(null);
    }
  }, [event, isOpen]);

  const {
    register,
    handleSubmit,
    setError: setFormFieldError,
    formState: { errors },
    reset
  } = useForm<EditEventFields>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
    }
  });

  // Re-sync form defaultValues when event changes
  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        description: event.description || "",
      });
    }
  }, [event, reset]);

  const handleRangeChange = (from: Date | null, to: Date | null) => {
    setFromDate(from);
    setToDate(to);
    if (from && to) {
      setDateError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setBannerError("Image size exceeds 5MB limit");
      setBannerFile(null);
      setBannerPreview(null);
      return;
    }

    // Validate type
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setBannerError("Only PNG, JPG, and JPEG images are supported");
      setBannerFile(null);
      setBannerPreview(null);
      return;
    }

    setBannerError(null);
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setShowUploadUI(false);
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setBannerError(null);
    setShowUploadUI(true);
  };

  const onSubmit = async (data: EditEventFields) => {
    if (!fromDate || !toDate) {
      setDateError("Please select a start and end date");
      return;
    }

    let finalCurrency = selectedCurrency;
    if (currencyMode === "CUSTOM") {
      if (!/^[A-Za-z]{3}$/.test(customCurrency)) {
        setCurrencyError("Custom currency must be exactly a 3-character alphabetic code");
        return;
      }
      finalCurrency = customCurrency.toUpperCase();
    }

    setDateError(null);
    setCurrencyError(null);
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("startDate", fromDate.toISOString());
      formData.append("endDate", toDate.toISOString());
      formData.append("currency", finalCurrency);
      if (bannerFile) {
        formData.append("banner", bannerFile);
      }

      await fetchApi<any>(`/events/${event.id}`, {
        method: "PUT",
        body: formData,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.data && err.data.result && typeof err.data.result === "object") {
        Object.entries(err.data.result).forEach(([field, msg]) => {
          if (field === "banner") {
            setBannerError(msg as string);
          } else if (field === "startDate" || field === "endDate" || field === "dateRange") {
            setDateError(msg as string);
          } else if (field === "currency") {
            setCurrencyError(msg as string);
          } else if (field === "title" || field === "description") {
            setFormFieldError(field as any, { type: "server", message: msg as string });
          } else {
            setError(msg as string);
          }
        });
      } else if (err.data && err.data.msg) {
        setError(err.data.msg);
      } else {
        setError(err.message || "Failed to update event workspace");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setDateError(null);
    setBannerError(null);
    setBannerFile(null);
    setBannerPreview(null);
    onClose();
  };

  const currentBannerUrl = event?.bannerUrl || null;

  return (
    <>
      <Modal
        isOpen={isOpen}
      onClose={handleClose}
      title="EDIT EVENT WORKSPACE"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
          Update the profile details of this event workspace, including timing configurations or cover showcase assets.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
            {error}
          </div>
        )}

        <Input
          id="edit-event-title"
          label="Event Title"
          type="text"
          placeholder="e.g. Wedding Party"
          error={errors.title?.message}
          disabled={loading}
          {...register("title")}
        />

        <div>
          <label htmlFor="edit-event-description" className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide">
            Event Description (Optional)
          </label>
          <textarea
            id="edit-event-description"
            placeholder="Provide event details, location notes..."
            rows={3}
            disabled={loading}
            {...register("description")}
            className="w-full bg-[#18181b] border border-white/10 focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.25)] rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none transition-all font-sans text-sm resize-none"
          />
        </div>

        <div>
          <span className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide">
            Event Planning Dates Configuration
          </span>
          <DateRangePicker 
            initialFrom={fromDate} 
            initialTo={toDate} 
            onRangeChange={handleRangeChange} 
          />
          {dateError && (
            <p className="text-xs text-red-400 mt-1.5 font-medium">
              {dateError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="edit-event-currency" className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide">
            Event Currency Configuration
          </label>
          <div className="flex gap-3">
            <select
              id="edit-event-currency"
              value={currencyMode === "CUSTOM" ? "CUSTOM" : selectedCurrency}
              onChange={(e) => {
                const val = e.target.value;
                setCurrencyError(null);
                
                const targetCurrency = val;
                const targetMode = val === "CUSTOM" ? "CUSTOM" : "PREDEFINED";
                
                // Compare with original event.currency
                const originalVal = event.currency || "USD";
                const isDifferent = val === "CUSTOM" ? (originalVal !== customCurrency) : (originalVal !== val);
                
                if (isDifferent) {
                  setPendingCurrency(targetCurrency);
                  setPendingCurrencyMode(targetMode);
                  setShowWarningModal(true);
                } else {
                  setCurrencyMode(targetMode);
                  if (targetMode === "PREDEFINED") {
                    setSelectedCurrency(targetCurrency);
                  }
                }
              }}
              disabled={loading}
              className="bg-[#18181b] border border-white/10 focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.25)] rounded-lg px-4 py-2.5 text-white focus:outline-none transition-all font-sans text-xs flex-1 cursor-pointer"
            >
              <option value="USD">USD ($)</option>
              <option value="PHP">PHP (₱)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="SGD">SGD (S$)</option>
              <option value="CUSTOM">Custom Code...</option>
            </select>

            {currencyMode === "CUSTOM" && (
              <input
                type="text"
                maxLength={3}
                placeholder="e.g. CAD"
                value={customCurrency}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setCurrencyError(null);
                  
                  // Only warn if they type a valid 3-letter code that is different from original
                  const originalVal = event.currency || "USD";
                  if (val.length === 3 && val !== originalVal) {
                    setPendingCurrency(val);
                    setPendingCurrencyMode("CUSTOM");
                    setShowWarningModal(true);
                  } else {
                    setCustomCurrency(val);
                  }
                }}
                disabled={loading}
                className="bg-[#18181b] border border-white/10 focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.25)] rounded-lg px-4 py-2.5 text-white focus:outline-none transition-all font-mono text-xs w-28 uppercase"
              />
            )}
          </div>
          {currencyError && (
            <p className="text-xs text-red-400 mt-1.5 font-medium">
              {currencyError}
            </p>
          )}
        </div>

        <div>
          <span className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide">
            Event Banner Image
          </span>

          {(bannerPreview || currentBannerUrl) && !showUploadUI ? (
            <div className="relative rounded-xl overflow-hidden border border-white/15 bg-zinc-900 aspect-video group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerPreview || currentBannerUrl || ""}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-heading font-medium tracking-wide transition-all cursor-pointer shadow-lg"
                >
                  Change Image
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-white/5
                  ${bannerError ? "border-red-500/30" : "border-white/10 hover:border-neon-purple/40"}
                `}
              >
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="hidden"
                />
                <ImageIcon className="w-8 h-8 text-zinc-500 mb-2" />
                <span className="text-xs font-heading font-medium text-zinc-300">
                  Select Banner Image Asset
                </span>
                <span className="text-[10px] text-zinc-500 font-sans mt-0.5">
                  Supports PNG, JPG, or JPEG up to 5MB
                </span>
              </label>
              {currentBannerUrl && (
                <button
                  type="button"
                  onClick={() => setShowUploadUI(false)}
                  className="text-zinc-500 hover:text-white text-xs font-sans underline block text-center w-full"
                >
                  Keep current banner
                </button>
              )}
            </div>
          )}

          {bannerError && (
            <p className="text-xs text-red-400 mt-1.5 font-medium flex items-center gap-1">
              {bannerError}
            </p>
          )}
        </div>
      </form>
    </Modal>

      {/* Currency Warning Modal (Overlay) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-red-500/25 bg-[#121214] p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-left">
            <h3 className="text-sm font-bold font-heading text-red-400 uppercase tracking-wider mb-2">
              ⚠️ Warning: Currency Change
            </h3>
            <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-4">
              You are changing the event currency from <strong className="text-white">{event.currency || "USD"}</strong> to <strong className="text-white">{pendingCurrency === "CUSTOM" ? "a custom currency" : pendingCurrency}</strong>.
              <br /><br />
              Please note that all existing estimated budget costs and actual expenditure values will keep their current numerical amounts and will <strong>not</strong> be automatically converted. You will need to adjust these values manually.
            </p>
            <div className="flex justify-end gap-3 text-xs font-heading font-medium">
              <button
                type="button"
                onClick={() => {
                  setShowWarningModal(false);
                  setPendingCurrency(null);
                  setPendingCurrencyMode(null);
                }}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingCurrencyMode && pendingCurrency) {
                    setCurrencyMode(pendingCurrencyMode);
                    if (pendingCurrencyMode === "PREDEFINED") {
                      setSelectedCurrency(pendingCurrency);
                    } else {
                      setCustomCurrency(pendingCurrency);
                    }
                  }
                  setShowWarningModal(false);
                  setPendingCurrency(null);
                  setPendingCurrencyMode(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all cursor-pointer shadow-lg"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
