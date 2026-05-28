package com.planohi.api.dto;

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
    private Instant respondedAt;
}
