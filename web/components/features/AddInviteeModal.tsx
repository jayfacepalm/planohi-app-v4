"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { UserPlus } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

const addInviteeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(150, "Name is too long"),
  allowedGuests: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
    message: "Allowed guests must be at least 1",
  }),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
});

type AddInviteeFields = z.infer<typeof addInviteeSchema>;

interface AddInviteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: () => void;
}

export const AddInviteeModal: React.FC<AddInviteeModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError: setFormFieldError,
    reset,
    formState: { errors },
  } = useForm<AddInviteeFields>({
    resolver: zodResolver(addInviteeSchema),
    defaultValues: {
      name: "",
      allowedGuests: "1",
      email: "",
    },
  });

  const onSubmit = async (data: AddInviteeFields) => {
    setLoading(true);
    setError(null);
    try {
      await fetchApi<any>(`/events/${eventId}/invitees`, {
        method: "POST",
        body: JSON.stringify([{
          name: data.name,
          allowedGuests: Number(data.allowedGuests),
          email: data.email || null,
        }]),
        headers: {
          "Content-Type": "application/json",
        },
      });
      reset();
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
        setError(err.message || "Failed to add guest to invite list");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="ADD GUEST INVITATION"
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
            <UserPlus className="w-4 h-4" />
            {loading ? "Adding..." : "Add Guest"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
          Invite a guest/party (e.g. Jane & Family) and define their headcount limit for RSVP checks.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
            {error}
          </div>
        )}

        <Input
          id="invitee-name"
          label="Guest Name / Party"
          type="text"
          placeholder="e.g. Jane & Family"
          error={errors.name?.message}
          disabled={loading}
          {...register("name")}
        />

        <Input
          id="allowed-guests"
          label="Allowed Party Limit"
          type="number"
          min="1"
          placeholder="e.g. 4"
          error={errors.allowedGuests?.message}
          disabled={loading}
          {...register("allowedGuests")}
        />

        <Input
          id="invitee-email"
          label="Guest Email (Optional)"
          type="email"
          placeholder="e.g. jane@example.com"
          error={errors.email?.message}
          disabled={loading}
          {...register("email")}
        />
      </form>
    </Modal>
  );
};
