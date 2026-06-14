package com.planohi.api.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.planohi.api.util.MaskedEmailSerializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteeDto {
    private UUID id;
    private UUID eventId;
    private String name;
    private String token;
    private int allowedGuests;
    private int attendingGuests;
    private String status;

    @JsonSerialize(using = MaskedEmailSerializer.class)
    private String email;

    private Instant respondedAt;
    private Instant lastSentAt;
}
