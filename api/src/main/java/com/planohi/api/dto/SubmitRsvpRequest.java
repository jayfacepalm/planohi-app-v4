package com.planohi.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubmitRsvpRequest {
    @NotBlank(message = "RSVP status is required")
    private String status;
    private int attendingGuests;
}
