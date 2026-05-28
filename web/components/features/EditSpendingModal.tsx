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

const editSpendingSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters").max(255, "Description is too long"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Spending amount must be a positive number greater than 0",
  }),
  spentAt: z.date(),
});

type EditSpendingFields = z.infer<typeof editSpendingSchema>;

interface EditSpendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentId: string;
  spending: {
    id: string;
    description: string;
    amount: number;
    spentAt: string;
  } | null;
  onSuccess: () => void;
}

export const EditSpendingModal: React.FC<EditSpendingModalProps> = ({
  isOpen,
  onClose,
  componentId,
  spending,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setError: setFormFieldError,
    reset,
    formState: { errors },
  } = useForm<EditSpendingFields>({
    resolver: zodResolver(editSpendingSchema),
    defaultValues: {
      description: "",
      amount: "",
      spentAt: new Date(),
    },
  });

  // Sync form defaultValues when spending changes or modal opens
  useEffect(() => {
    if (spending && isOpen) {
      reset({
        description: spending.description,
        amount: String(spending.amount),
        spentAt: new Date(spending.spentAt),
      });
      setError(null);
    }
  }, [spending, isOpen, reset]);

  const onSubmit = async (data: EditSpendingFields) => {
    if (!spending) return;
    setLoading(true);
    setError(null);
    try {
      await fetchApi<any>(`/components/${componentId}/spendings/${spending.id}`, {
        method: "PUT",
        body: JSON.stringify({
          description: data.description,
          amount: Number(data.amount),
          spentAt: data.spentAt.toISOString(),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.data && err.data.result && typeof err.data.result === "object") {
        Object.entries(err.data.result).forEach(([field, msg]) => {
          setFormFieldError(field as any, { type: "server", message: msg as string });
        });
      } else if (err.data && err.data.msg) {
        setError(err.data.msg);
      } else {
        setError(err.message || "Failed to update spending transaction");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="EDIT SPENDING TRANSACTION"
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
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
          Update the transaction details, purchase description, or actual amount logged for this expense.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
            {error}
          </div>
        )}

        <Input
          id="edit-spending-description"
          label="Expense Description"
          type="text"
          placeholder="e.g. Down payment for catering"
          error={errors.description?.message}
          disabled={loading}
          {...register("description")}
        />

        <Input
          id="edit-spending-amount"
          label="Amount Spent (PHP)"
          type="number"
          step="0.01"
          placeholder="e.g. 5000"
          error={errors.amount?.message}
          disabled={loading}
          {...register("amount")}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-heading font-semibold text-zinc-400 uppercase tracking-wide block">
            Date & Time Spent
          </label>
          <Controller
            control={control}
            name="spentAt"
            render={({ field }) => (
              <DatePicker
                selected={field.value}
                onChange={field.onChange}
                label=""
                placeholder="Select date and time spent"
                align="bottom"
              />
            )}
          />
          {errors.spentAt && (
            <span className="text-[10px] text-red-500 font-sans block mt-1">{errors.spentAt.message}</span>
          )}
        </div>
      </form>
    </Modal>
  );
};
