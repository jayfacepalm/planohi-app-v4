package com.planohi.api.service;

import com.planohi.api.dto.CreateSpendingRequest;
import com.planohi.api.dto.EventSpendingDto;
import java.util.UUID;

public interface EventSpendingService {
    EventSpendingDto createSpending(UUID userId, UUID componentId, CreateSpendingRequest request);
}
