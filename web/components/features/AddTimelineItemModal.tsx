"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { DatePicker } from "../ui/DatePicker";
import { Plus } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

const addTimelineSchema = z.object({
  title: z.string().min(2, "Milestone title must be at least 2 characters").max(255, "Milestone title is too long"),
  dueAt: z.date(),
});

type AddTimelineFields = z.infer<typeof addTimelineSchema>;

interface AddTimelineItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventStartDate: string;
  eventEndDate: string;
  onSuccess: () => void;
}

export const AddTimelineItemModal: React.FC<AddTimelineItemModalProps> = ({
  isOpen,
  onClose,
  eventId,
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
  } = useForm<AddTimelineFields>({
    resolver: zodResolver(addTimelineSchema),
    defaultValues: {
      title: "",
      dueAt: minDate,
    },
  });

  const onSubmit = async (data: AddTimelineFields) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi<any>(`/events/${eventId}/timeline`, {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          dueAt: data.dueAt.toISOString(),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      reset({
        title: "",
        dueAt: minDate,
      });
      if (response && response.targetType) {
        setSuccessMessage("Change proposal submitted: Milestone creation queued for Organizer review.");
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
        setError(err.message || "Failed to add timeline item");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset({
      title: "",
      dueAt: minDate,
    });
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  const isSuccess = !!successMessage;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isSuccess ? "PROPOSAL SUBMITTED" : "ADD TIMELINE MILESTONE"}
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
              <Plus className="w-4 h-4" />
              {loading ? "Adding..." : "Add Milestone"}
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
          Create a specific preparation task or milestone checklist item for your event.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
            {error}
          </div>
        )}

        <Input
          id="timeline-title"
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
