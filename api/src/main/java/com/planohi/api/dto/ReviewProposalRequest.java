package com.planohi.api.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewProposalRequest {

    @NotNull(message = "Review action cannot be null")
    private String action; // "APPROVE" | "REJECT"
}
