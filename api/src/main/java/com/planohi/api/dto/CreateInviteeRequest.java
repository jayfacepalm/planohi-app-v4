package com.planohi.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInviteeRequest {
    @NotBlank(message = "Guest name is required")
    @Size(max = 150, message = "Name must not exceed 150 characters")
    private String name;

    @Min(value = 1, message = "Allowed guest headcount limit must be at least 1")
    private int allowedGuests;
}
