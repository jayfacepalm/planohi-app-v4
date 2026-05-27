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
public class EventDto {
    private UUID id;
    private String title;
    private String description;
    private Instant startDate;
    private Instant endDate;
    private String bannerUrl;
    private BigDecimal totalEstimatedCost;
    private Instant createdAt;
}
