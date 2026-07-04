"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { DatePicker } from "../ui/DatePicker";
import { Save } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

const editTimelineSchema = z.object({
  title: z.string().min(2, "Milestone title must be at least 2 characters").max(255, "Milestone title is too long"),
  dueAt: z.date(),
});

type EditTimelineFields = z.infer<typeof editTimelineSchema>;

interface EditTimelineItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  item: {
    id: string;
    title: string;
    dueAt: string;
  } | null;
  eventStartDate: string;
  eventEndDate: string;
  onSuccess: () => void;
}

export const EditTimelineItemModal: React.FC<EditTimelineItemModalProps> = ({
  isOpen,
  onClose,
  eventId,
  item,
  eventStartDate,
  eventEndDate,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const minDate = new Date(eventStartDate);
  const maxDate = new Date(eventEndDate);

  const {
    register,
    handleSubmit,
    control,
    setError: setFormFieldError,
    reset,
    formState: { errors },
  } = useForm<EditTimelineFields>({
    resolver: zodResolver(editTimelineSchema),
    defaultValues: {
      title: "",
      dueAt: minDate,
    },
  });

  // Reset form with item data when modal opens or item changes
  useEffect(() => {
    if (item) {
      reset({
        title: item.title,
        dueAt: new Date(item.dueAt),
      });
      setError(null);
      setSuccessMessage(null);
    }
  }, [item, reset]);

  const onSubmit = async (data: EditTimelineFields) => {
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi<any>(`/timeline/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: data.title,
          dueAt: data.dueAt.toISOString(),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response && response.targetType) {
        setSuccessMessage("Change proposal submitted: Milestone update queued for Organizer review.");
        onSuccess();
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      if (err.data && err.data.result && typeof err.data.result === "object") {
        Object.entries(err.data.result).forEach(([field, msg]) => {
          setFormFieldError(field as any, { type: "server", message: msg as string });
        });
      } else if (err.data && err.data.msg) {
        setError(err.data.msg);
      } else {
        setError(err.message || "Failed to update timeline item");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  const isSuccess = !!successMessage;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isSuccess ? "PROPOSAL SUBMITTED" : "EDIT TIMELINE MILESTONE"}
      footer={
        isSuccess ? (
          <Button variant="primary" onClick={handleClose}>
            Got it
          </Button>
        ) : (
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
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )
      }
    >
      {isSuccess ? (
        <div className="space-y-4 py-2">
          <p className="text-sm text-zinc-300 leading-relaxed">
            {successMessage}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Modify the milestone's target date or checklist description.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
              {error}
            </div>
          )}

          <Input
            id="edit-timeline-title"
            label="Milestone Title"
            type="text"
            placeholder="e.g. Send out RSVP invitations"
            error={errors.title?.message}
            disabled={loading}
            {...register("title")}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-heading font-semibold text-zinc-400 uppercase tracking-wide block">
              Target Date & Time
            </label>
            <Controller
              control={control}
              name="dueAt"
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onChange={field.onChange}
                  label=""
                  placeholder="Select target date and time"
                  minDate={minDate}
                  maxDate={maxDate}
                  align="bottom"
                />
              )}
            />
            {errors.dueAt && (
              <span className="text-[10px] text-red-500 font-sans block mt-1">{errors.dueAt.message}</span>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
};
