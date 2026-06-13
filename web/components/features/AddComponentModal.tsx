"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Plus } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

const addComponentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  estimatedCost: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 9999999999.99, {
    message: "Estimated cost must be between 0 and 9,999,999,999.99",
  }),
});

type AddComponentFields = z.infer<typeof addComponentSchema>;

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: () => void;
}

export const AddComponentModal: React.FC<AddComponentModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError: setFormFieldError,
    reset,
    formState: { errors },
  } = useForm<AddComponentFields>({
    resolver: zodResolver(addComponentSchema),
    defaultValues: {
      name: "",
      estimatedCost: "",
    },
  });

  const onSubmit = async (data: AddComponentFields) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi<any>(`/events/${eventId}/components`, {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          estimatedCost: Number(data.estimatedCost),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      reset();
      if (response && response.targetType) {
        setSuccessMessage("Change proposal submitted: Category creation queued for Organizer review.");
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
        setError(err.message || "Failed to add budgeting component");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  const isSuccess = !!successMessage;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isSuccess ? "PROPOSAL SUBMITTED" : "ADD BUDGET COMPONENT"}
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
              {loading ? "Adding..." : "Add Component"}
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
          Define a cost category (e.g. Venue, Catering, Transportation) with its estimated expense.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
            {error}
          </div>
        )}

        <Input
          id="component-name"
          label="Component Name"
          type="text"
          placeholder="e.g. Venue Reservation"
          error={errors.name?.message}
          disabled={loading}
          {...register("name")}
        />

        <Input
          id="component-cost"
          label="Estimated Cost (PHP)"
          type="number"
          step="0.01"
          placeholder="e.g. 25000"
          error={errors.estimatedCost?.message}
          disabled={loading}
          {...register("estimatedCost")}
        />
      </form>
      )}
    </Modal>
  );
};
