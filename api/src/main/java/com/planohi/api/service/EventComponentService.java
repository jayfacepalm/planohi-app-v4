package com.planohi.api.service;

import com.planohi.api.dto.BudgetSummaryResponse;
import com.planohi.api.dto.CreateComponentRequest;
import com.planohi.api.dto.EventComponentDto;
import com.planohi.api.dto.EventComponentsResponse;
import com.planohi.api.dto.UpdateComponentRequest;
import java.util.UUID;

public interface EventComponentService {
    EventComponentDto createComponent(UUID userId, UUID eventId, CreateComponentRequest request);
    EventComponentDto updateComponent(UUID userId, UUID eventId, UUID componentId, UpdateComponentRequest request);
    EventComponentsResponse getComponents(UUID userId, UUID eventId);
    EventComponentsResponse getComponentsInternal(UUID eventId);
    void deleteComponent(UUID userId, UUID eventId, UUID componentId);
    BudgetSummaryResponse getBudgetSummary(UUID userId, UUID eventId);
    BudgetSummaryResponse getBudgetSummaryInternal(UUID eventId);
}
