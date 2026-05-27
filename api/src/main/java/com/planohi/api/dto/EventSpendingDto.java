package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventSpendingDto {
    private UUID id;
    private UUID componentId;
    private UUID eventId;
    private String description;
    private BigDecimal amount;
    private Instant spentAt;
    private Instant createdAt;
}
