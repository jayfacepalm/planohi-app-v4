package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicRsvpDetailsDto {
    private String inviteeName;
    private int allowedGuests;
    private int attendingGuests;
    private String status;
    private EventDto event;
}
