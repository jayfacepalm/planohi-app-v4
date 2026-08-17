package com.planohi.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTimelineItemRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 2, max = 255, message = "Title must be between 2 and 255 characters")
    private String title;

    @NotNull(message = "Due date is required")
    private Instant dueAt;

    private SpendingPayload spending;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SpendingPayload {
        @NotNull(message = "Component ID is required when spending is provided")
        private java.util.UUID componentId;

        @NotNull(message = "Amount is required when spending is provided")
        private java.math.BigDecimal amount;

        @NotBlank(message = "Description is required when spending is provided")
        @Size(min = 2, max = 255, message = "Description must be between 2 and 255 characters")
        private String description;
    }
}
