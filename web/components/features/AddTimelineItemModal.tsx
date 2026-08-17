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
import { Checkbox } from "../ui/Checkbox";

const addTimelineSchema = z.object({
  title: z.string().min(2, "Milestone title must be at least 2 characters").max(255, "Milestone title is too long"),
  dueAt: z.date(),
  includeSpending: z.boolean().optional(),
  spendingComponentId: z.string().optional(),
  spendingAmount: z.string().optional(),
  spendingDescription: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.includeSpending) {
    if (!data.spendingComponentId) {
      ctx.addIssue({ path: ["spendingComponentId"], code: z.ZodIssueCode.custom, message: "Please select a budget component" });
    }
    if (!data.spendingAmount || isNaN(Number(data.spendingAmount)) || Number(data.spendingAmount) <= 0) {
      ctx.addIssue({ path: ["spendingAmount"], code: z.ZodIssueCode.custom, message: "Amount must be greater than 0" });
    }
    if (!data.spendingDescription || data.spendingDescription.length < 2) {
      ctx.addIssue({ path: ["spendingDescription"], code: z.ZodIssueCode.custom, message: "Description must be at least 2 characters" });
    }
  }
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
  const [components, setComponents] = useState<any[]>([]);

  const minDate = new Date(eventStartDate);
  const maxDate = new Date(eventEndDate);

  React.useEffect(() => {
    if (isOpen) {
      fetchApi<any>(`/events/${eventId}/components`)
        .then((res) => {
          if (res && res.components) setComponents(res.components);
        })
        .catch((err) => console.error("Failed to fetch components", err));
    }
  }, [isOpen, eventId]);

  const {
    register,
    handleSubmit,
    control,
    setError: setFormFieldError,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<AddTimelineFields>({
    resolver: zodResolver(addTimelineSchema),
    defaultValues: {
      title: "",
      dueAt: minDate,
      includeSpending: false,
      spendingComponentId: "",
      spendingAmount: "",
      spendingDescription: "",
    },
  });

  const isIncludeSpending = watch("includeSpending");

  const onSubmit = async (data: AddTimelineFields) => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        title: data.title,
        dueAt: data.dueAt.toISOString(),
      };
      if (data.includeSpending) {
        payload.spending = {
          componentId: data.spendingComponentId,
          amount: Number(data.spendingAmount),
          description: data.spendingDescription,
        };
      }

      const response = await fetchApi<any>(`/events/${eventId}/timeline`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
      });
      reset({
        title: "",
        dueAt: minDate,
        includeSpending: false,
        spendingComponentId: "",
        spendingAmount: "",
        spendingDescription: "",
      });
      if (response && response.targetType) {
        setSuccessMessage("Change proposal submitted: Milestone creation queued for Organizer review.");
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
      includeSpending: false,
      spendingComponentId: "",
      spendingAmount: "",
      spendingDescription: "",
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

        <div className="pt-2 border-t border-zinc-800">
          <Controller
            control={control}
            name="includeSpending"
            render={({ field }) => (
              <Checkbox
                id="include-spending"
                label="Log a spending associated with this milestone"
                checked={field.value || false}
                onChange={(checked) => {
                  field.onChange(checked);
                  if (checked) {
                    const currentTitle = getValues("title");
                    if (currentTitle) {
                      setValue("spendingDescription", currentTitle, { shouldValidate: true });
                    }
                  }
                }}
                disabled={loading}
              />
            )}
          />
        </div>

        {isIncludeSpending && (
          <div className="space-y-4 pt-2 pb-2 pl-4 border-l-2 border-zinc-800">
            <div className="space-y-1.5">
              <label className="text-xs font-heading font-semibold text-zinc-400 uppercase tracking-wide block">
                Budget Component
              </label>
              <select
                className={`w-full bg-zinc-900 border ${
                  errors.spendingComponentId ? "border-red-500/50" : "border-zinc-800"
                } text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/50`}
                disabled={loading}
                {...register("spendingComponentId")}
              >
                <option value="">Select a component...</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.spendingComponentId && (
                <span className="text-[10px] text-red-500 font-sans block mt-1">
                  {errors.spendingComponentId.message}
                </span>
              )}
            </div>

            <Input
              id="spending-amount"
              label="Amount Spent"
              type="number"
              step="0.01"
              placeholder="e.g. 500"
              error={errors.spendingAmount?.message}
              disabled={loading}
              {...register("spendingAmount")}
            />

            <Input
              id="spending-description"
              label="Expense Description"
              type="text"
              placeholder="e.g. Vendor deposit"
              error={errors.spendingDescription?.message}
              disabled={loading}
              {...register("spendingDescription")}
            />
          </div>
        )}
      </form>
      )}
    </Modal>
  );
};
