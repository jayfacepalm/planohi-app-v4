package com.planohi.api.service;

import com.planohi.api.dto.CreateSpendingRequest;
import com.planohi.api.dto.EventSpendingDto;
import com.planohi.api.dto.UpdateSpendingRequest;
import java.util.UUID;

public interface EventSpendingService {
    EventSpendingDto createSpending(UUID userId, UUID componentId, CreateSpendingRequest request);
    EventSpendingDto updateSpending(UUID userId, UUID componentId, UUID spendingId, UpdateSpendingRequest request);
    EventSpendingDto deleteSpending(UUID userId, UUID componentId, UUID spendingId);
}
