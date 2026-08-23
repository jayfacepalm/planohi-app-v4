package com.planohi.api.service.cached;

import com.planohi.api.dto.BudgetSummaryResponse;
import com.planohi.api.dto.CreateComponentRequest;
import com.planohi.api.dto.EventComponentDto;
import com.planohi.api.dto.EventComponentsResponse;
import com.planohi.api.dto.UpdateComponentRequest;
import com.planohi.api.service.EventComponentService;
import com.planohi.api.service.WorkspaceSecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventComponentCachedService {

    private final EventComponentService eventComponentService;
    private final EventCacheInvalidationService eventCacheInvalidationService;
    private final WorkspaceSecurityService workspaceSecurityService;

    @Lazy
    @Autowired
    private EventComponentCachedService self;

    public EventComponentsResponse getComponents(UUID userId, UUID eventId) {
        workspaceSecurityService.checkReadAccess(userId, eventId);
        return self.getComponentsCache(eventId);
    }

    @Cacheable(value = "event_components", key = "#eventId.toString()")
    public EventComponentsResponse getComponentsCache(UUID eventId) {
        log.info("Cache miss: fetching components for event: {}", eventId);
        return eventComponentService.getComponentsInternal(eventId);
    }

    public BudgetSummaryResponse getBudgetSummary(UUID userId, UUID eventId) {
        workspaceSecurityService.checkReadAccess(userId, eventId);
        return self.getBudgetSummaryCache(eventId);
    }

    @Cacheable(value = "event_budget_summary", key = "#eventId.toString()")
    public BudgetSummaryResponse getBudgetSummaryCache(UUID eventId) {
        log.info("Cache miss: fetching budget summary for event: {}", eventId);
        return eventComponentService.getBudgetSummaryInternal(eventId);
    }

    public EventComponentDto createComponent(UUID userId, UUID eventId, CreateComponentRequest request) {
        log.info("Evicting component, detail, summary, and list caches due to component creation in event: {}", eventId);
        EventComponentDto dto = eventComponentService.createComponent(userId, eventId, request);
        eventCacheInvalidationService.evictEventCaches(eventId);
        return dto;
    }

    public EventComponentDto updateComponent(UUID userId, UUID eventId, UUID componentId, UpdateComponentRequest request) {
        log.info("Evicting component, detail, summary, and list caches due to component update {} in event: {}", componentId, eventId);
        EventComponentDto dto = eventComponentService.updateComponent(userId, eventId, componentId, request);
        eventCacheInvalidationService.evictEventCaches(eventId);
        return dto;
    }

    public void deleteComponent(UUID userId, UUID eventId, UUID componentId) {
        log.info("Evicting component, detail, summary, and list caches due to component deletion from event: {}", eventId);
        eventComponentService.deleteComponent(userId, eventId, componentId);
        eventCacheInvalidationService.evictEventCaches(eventId);
    }
}
