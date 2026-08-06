package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventShareSummaryDto {
    private UUID eventId;
    private String title;
    private String description;
    private String currency;
    private String shareUrl;
    private BigDecimal totalPlannedCost;
    private BigDecimal totalActualSpent;
    private List<TimelineItemShareDto> timeline;
    private List<ComponentBudgetShareDto> components;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimelineItemShareDto {
        private String title;
        private Instant dueAt;
        private boolean isDone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComponentBudgetShareDto {
        private String name;
        private BigDecimal estimatedCost;
        private BigDecimal actualSpent;
    }
}
