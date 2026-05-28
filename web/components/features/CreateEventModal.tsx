"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { DateRangePicker } from "../ui/DateRangePicker";
import { fetchApi } from "../../lib/api-client";
import { Image as ImageIcon, Plus } from "lucide-react";

const createEventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(255, "Title is too long"),
  description: z.string().optional(),
});

type CreateEventFields = z.infer<typeof createEventSchema>;

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom states for date picker & banner upload
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError: setFormFieldError,
    reset,
    formState: { errors },
  } = useForm<CreateEventFields>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

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
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setBannerError(null);
  };

  const onSubmit = async (data: CreateEventFields) => {
    if (!fromDate || !toDate) {
      setDateError("Please select a start and end date");
      return;
    }

    setDateError(null);
    setLoading(true);
    setError(null);

    try {
      const toUtcDateString = (date: Date) => {
        return date.toISOString();
      };

      const formData = new FormData();
      formData.append("title", data.title);
      if (data.description) {
        formData.append("description", data.description);
      }
      formData.append("startDate", toUtcDateString(fromDate));
      formData.append("endDate", toUtcDateString(toDate));
      if (bannerFile) {
        formData.append("banner", bannerFile);
      }

      await fetchApi<any>("/events", {
        method: "POST",
        body: formData,
      });

      handleClose();
      onSuccess();
    } catch (err: any) {
      if (err.data && err.data.result && typeof err.data.result === "object") {
        Object.entries(err.data.result).forEach(([field, msg]) => {
          if (field === "banner") {
            setBannerError(msg as string);
          } else {
            setFormFieldError(field as any, { type: "server", message: msg as string });
          }
        });
      } else if (err.data && err.data.msg) {
        setError(err.data.msg);
      } else {
        setError(err.message || "Failed to create event");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setFromDate(null);
    setToDate(null);
    setBannerFile(null);
    setBannerPreview(null);
    setError(null);
    setDateError(null);
    setBannerError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="CREATE NEW EVENT"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {loading ? "Establishing..." : "Create Event"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
          Establish a central planning profile. You can upload custom banner files and define component budget allocations inside your event canvas.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
            {error}
          </div>
        )}

        <Input
          id="event-title"
          label="Event Title"
          type="text"
          placeholder="e.g. Wedding Party"
          error={errors.title?.message}
          disabled={loading}
          {...register("title")}
        />

        <div>
          <label htmlFor="event-description" className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide">
            Event Description (Optional)
          </label>
          <textarea
            id="event-description"
            placeholder="Provide event details, location notes, or theme descriptions..."
            rows={3}
            disabled={loading}
            {...register("description")}
            className="w-full bg-[#18181b] border border-white/10 focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.25)] rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none transition-all font-sans text-xs resize-none"
          />
        </div>

        <div>
          <span className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide">
            Event Planning Dates Configuration
          </span>
          <DateRangePicker onRangeChange={handleRangeChange} />
          {dateError && (
            <p className="text-xs text-red-400 mt-1.5 font-medium flex items-center gap-1">
              {dateError}
            </p>
          )}
        </div>

        <div>
          <span className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide">
            Event Banner Showcase Image (Optional)
          </span>

          {bannerPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-white/15 bg-zinc-900 aspect-video group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerPreview}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-heading font-medium tracking-wide transition-all cursor-pointer shadow-lg"
                >
                  Remove Image
                </button>
              </div>
            </div>
          ) : (
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
              <ImageIcon className="w-6 h-6 text-zinc-500 mb-2" />
              <span className="text-xs font-heading font-medium text-zinc-300">
                Select Banner Image Asset
              </span>
              <span className="text-[9px] text-zinc-500 font-sans mt-0.5">
                Supports PNG, JPG, or JPEG up to 5MB
              </span>
            </label>
          )}

          {bannerError && (
            <p className="text-xs text-red-400 mt-1.5 font-medium flex items-center gap-1">
              {bannerError}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};
