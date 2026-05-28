package com.planohi.api.service.cached;

import com.planohi.api.dto.CreateSpendingRequest;
import com.planohi.api.dto.EventSpendingDto;
import com.planohi.api.dto.UpdateSpendingRequest;
import com.planohi.api.service.EventSpendingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventSpendingCachedService {

    private final EventSpendingService eventSpendingService;

    @Caching(evict = {
        @CacheEvict(value = "event_budget_summary", key = "#userId.toString() + ':' + #result.eventId.toString()"),
        @CacheEvict(value = "events_detail", key = "#userId.toString() + ':' + #result.eventId.toString()"),
        @CacheEvict(value = "event_components", key = "#userId.toString() + ':' + #result.eventId.toString()"),
        @CacheEvict(value = "events_list", allEntries = true)
    })
    public EventSpendingDto createSpending(UUID userId, UUID componentId, CreateSpendingRequest request) {
        log.info("Evicting budget summary, event detail, and event list caches for logged spending on component: {}", componentId);
        return eventSpendingService.createSpending(userId, componentId, request);
    }

    @Caching(evict = {
        @CacheEvict(value = "event_budget_summary", key = "#userId.toString() + ':' + #result.eventId.toString()"),
        @CacheEvict(value = "events_detail", key = "#userId.toString() + ':' + #result.eventId.toString()"),
        @CacheEvict(value = "event_components", key = "#userId.toString() + ':' + #result.eventId.toString()"),
        @CacheEvict(value = "events_list", allEntries = true)
    })
    public EventSpendingDto updateSpending(UUID userId, UUID componentId, UUID spendingId, UpdateSpendingRequest request) {
        log.info("Evicting budget summary, event detail, and event list caches for updated spending {} on component: {}", spendingId, componentId);
        return eventSpendingService.updateSpending(userId, componentId, spendingId, request);
    }

    @Caching(evict = {
        @CacheEvict(value = "event_budget_summary", key = "#userId.toString() + ':' + #result.eventId.toString()"),
        @CacheEvict(value = "events_detail", key = "#userId.toString() + ':' + #result.eventId.toString()"),
        @CacheEvict(value = "event_components", key = "#userId.toString() + ':' + #result.eventId.toString()"),
        @CacheEvict(value = "events_list", allEntries = true)
    })
    public EventSpendingDto deleteSpending(UUID userId, UUID componentId, UUID spendingId) {
        log.info("Evicting budget summary, event detail, and event list caches for deleted spending {} on component: {}", spendingId, componentId);
        return eventSpendingService.deleteSpending(userId, componentId, spendingId);
    }
}
