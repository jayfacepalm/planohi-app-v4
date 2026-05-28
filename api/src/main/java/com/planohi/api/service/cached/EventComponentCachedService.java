package com.planohi.api.service.cached;

import com.planohi.api.dto.BudgetSummaryResponse;
import com.planohi.api.dto.CreateComponentRequest;
import com.planohi.api.dto.EventComponentDto;
import com.planohi.api.dto.EventComponentsResponse;
import com.planohi.api.dto.UpdateComponentRequest;
import com.planohi.api.service.EventComponentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventComponentCachedService {

    private final EventComponentService eventComponentService;

    @Cacheable(value = "event_components", key = "#userId.toString() + ':' + #eventId.toString()")
    public EventComponentsResponse getComponents(UUID userId, UUID eventId) {
        log.info("Cache miss: fetching components for event: {}", eventId);
        return eventComponentService.getComponents(userId, eventId);
    }

    @Cacheable(value = "event_budget_summary", key = "#userId.toString() + ':' + #eventId.toString()")
    public BudgetSummaryResponse getBudgetSummary(UUID userId, UUID eventId) {
        log.info("Cache miss: fetching budget summary for event: {}", eventId);
        return eventComponentService.getBudgetSummary(userId, eventId);
    }

    @Caching(evict = {
            @CacheEvict(value = "event_components", key = "#userId.toString() + ':' + #eventId.toString()"),
            @CacheEvict(value = "events_detail", key = "#userId.toString() + ':' + #eventId.toString()"),
            @CacheEvict(value = "events_list", allEntries = true),
            @CacheEvict(value = "event_budget_summary", key = "#userId.toString() + ':' + #eventId.toString()")
    })
    public EventComponentDto createComponent(UUID userId, UUID eventId, CreateComponentRequest request) {
        log.info("Evicting component, detail, summary, and list caches due to component creation in event: {}",
                eventId);
        return eventComponentService.createComponent(userId, eventId, request);
    }

    @Caching(evict = {
            @CacheEvict(value = "event_components", key = "#userId.toString() + ':' + #eventId.toString()"),
            @CacheEvict(value = "events_detail", key = "#userId.toString() + ':' + #eventId.toString()"),
            @CacheEvict(value = "events_list", allEntries = true),
            @CacheEvict(value = "event_budget_summary", key = "#userId.toString() + ':' + #eventId.toString()")
    })
    public EventComponentDto updateComponent(UUID userId, UUID eventId, UUID componentId, UpdateComponentRequest request) {
        log.info("Evicting component, detail, summary, and list caches due to component update {} in event: {}",
                componentId, eventId);
        return eventComponentService.updateComponent(userId, eventId, componentId, request);
    }

    @Caching(evict = {
            @CacheEvict(value = "event_components", key = "#userId.toString() + ':' + #eventId.toString()"),
            @CacheEvict(value = "events_detail", key = "#userId.toString() + ':' + #eventId.toString()"),
            @CacheEvict(value = "events_list", allEntries = true),
            @CacheEvict(value = "event_budget_summary", key = "#userId.toString() + ':' + #eventId.toString()")
    })
    public void deleteComponent(UUID userId, UUID eventId, UUID componentId) {
        log.info("Evicting component, detail, summary, and list caches due to component deletion from event: {}",
                eventId);
        eventComponentService.deleteComponent(userId, eventId, componentId);
    }
}
