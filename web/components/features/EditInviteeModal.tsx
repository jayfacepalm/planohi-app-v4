"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Save } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

const editInviteeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  allowedGuests: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 1, {
    message: "Allowed guests must be at least 1",
  }),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
});

type EditInviteeFields = z.infer<typeof editInviteeSchema>;

interface EditInviteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  invitee: {
    id: string;
    name: string;
    allowedGuests: number;
    attendingGuests: number;
    email?: string | null;
  } | null;
  onSuccess: () => void;
}

export const EditInviteeModal: React.FC<EditInviteeModalProps> = ({
  isOpen,
  onClose,
  eventId,
  invitee,
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
  } = useForm<EditInviteeFields>({
    resolver: zodResolver(editInviteeSchema),
    defaultValues: {
      name: "",
      allowedGuests: "1",
      email: "",
    },
  });

  // Sync form defaultValues when invitee changes or modal opens
  useEffect(() => {
    if (invitee && isOpen) {
      reset({
        name: invitee.name,
        allowedGuests: String(invitee.allowedGuests),
        email: invitee.email || "",
      });
      setError(null);
    }
  }, [invitee, isOpen, reset]);

  const onSubmit = async (data: EditInviteeFields) => {
    if (!invitee) return;
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        name: data.name,
        allowedGuests: Number(data.allowedGuests),
      };
      if (data.email !== (invitee.email || "")) {
        payload.email = data.email || "";
      }

      await fetchApi<any>(`/events/${eventId}/invitees/${invitee.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
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
        setError(err.message || "Failed to update guest details");
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
      title="EDIT GUEST DETAILS"
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
          Update the guest party's name or edit their allowed party headcount. The headcount cannot be less than their already-confirmed RSVP party size.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans">
            {error}
          </div>
        )}

        <Input
          id="edit-invitee-name"
          label="Guest Name / Party"
          type="text"
          placeholder="e.g. Jane & Family"
          error={errors.name?.message}
          disabled={loading}
          {...register("name")}
        />

        <Input
          id="edit-invitee-allowed-guests"
          label="Allowed Party Limit"
          type="number"
          min="1"
          placeholder="e.g. 4"
          error={errors.allowedGuests?.message}
          disabled={loading}
          {...register("allowedGuests")}
        />

        <Input
          id="edit-invitee-email"
          label="Guest Email (Optional)"
          type="email"
          placeholder="e.g. jane@example.com"
          error={errors.email?.message}
          disabled={loading}
          {...register("email")}
        />

        {invitee && invitee.attendingGuests > 0 && (
          <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg p-3 text-[11px] text-neon-cyan font-mono leading-relaxed">
            Note: This guest has already confirmed an RSVP with <span className="font-extrabold">{invitee.attendingGuests}</span> attending {invitee.attendingGuests === 1 ? "guest" : "guests"}.
          </div>
        )}
      </form>
    </Modal>
  );
};
