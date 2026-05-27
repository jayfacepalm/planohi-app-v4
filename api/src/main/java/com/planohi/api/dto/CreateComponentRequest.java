package com.planohi.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateComponentRequest {

    @NotBlank(message = "Component name is required")
    @Size(min = 2, max = 100, message = "Component name must be between 2 and 100 characters")
    private String name;

    @NotNull(message = "Estimated cost is required")
    @DecimalMin(value = "0.00", message = "Estimated cost must be 0.00 or greater")
    private BigDecimal estimatedCost;
}
