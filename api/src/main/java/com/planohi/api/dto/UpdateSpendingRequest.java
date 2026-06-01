package com.planohi.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSpendingRequest {

    @NotBlank(message = "Spending description is required")
    @Size(min = 2, max = 255, message = "Description must be between 2 and 255 characters")
    private String description;

    @NotNull(message = "Spending amount is required")
    @DecimalMin(value = "0.01", message = "Spending amount must be 0.01 or greater")
    @DecimalMax(value = "9999999999.99", message = "Spending amount must be less than 10 billion (9,999,999,999.99)")
    private BigDecimal amount;

    @NotNull(message = "Spent date is required")
    private Instant spentAt;
}
