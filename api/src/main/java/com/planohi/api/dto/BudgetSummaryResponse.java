package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetSummaryResponse {
    private BigDecimal totalEstimatedCost;
    private BigDecimal totalActualSpent;
    private List<ComponentBudgetSummary> components;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComponentBudgetSummary {
        private UUID id;
        private String name;
        private BigDecimal estimatedCost;
        private BigDecimal actualSpent;
        private List<EventSpendingDto> spendings;
    }
}
