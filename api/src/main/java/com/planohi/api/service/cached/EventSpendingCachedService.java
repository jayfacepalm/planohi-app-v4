package com.planohi.api.service.cached;

import com.planohi.api.dto.CreateSpendingRequest;
import com.planohi.api.dto.EventSpendingDto;
import com.planohi.api.dto.UpdateSpendingRequest;
import com.planohi.api.service.EventSpendingService;
import com.planohi.api.service.WorkspaceSecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventSpendingCachedService {

    private final EventSpendingService eventSpendingService;
    private final EventCacheInvalidationService eventCacheInvalidationService;
    private final WorkspaceSecurityService workspaceSecurityService;

    @Lazy
    @Autowired
    private EventSpendingCachedService self;

    public Page<EventSpendingDto> getChronologicalSpendings(UUID userId, UUID eventId, String search, Pageable pageable) {
        workspaceSecurityService.checkReadAccess(userId, eventId);
        return self.getChronologicalSpendingsCache(eventId, search, pageable);
    }

    @Cacheable(value = "event_chronological_spendings", key = "#eventId.toString() + ':' + (#search != null ? #search : '') + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<EventSpendingDto> getChronologicalSpendingsCache(UUID eventId, String search, Pageable pageable) {
        log.info("Cache miss: fetching chronological spendings for event: {}", eventId);
        return eventSpendingService.getChronologicalSpendingsInternal(eventId, search, pageable);
    }

    public EventSpendingDto createSpending(UUID userId, UUID componentId, CreateSpendingRequest request) {
        log.info("Evicting wildcard event caches due to logged spending on component: {}", componentId);
        EventSpendingDto dto = eventSpendingService.createSpending(userId, componentId, request);
        eventCacheInvalidationService.evictEventCaches(dto.getEventId());
        return dto;
    }

    public EventSpendingDto updateSpending(UUID userId, UUID componentId, UUID spendingId, UpdateSpendingRequest request) {
        log.info("Evicting wildcard event caches due to updated spending {} on component: {}", spendingId, componentId);
        EventSpendingDto dto = eventSpendingService.updateSpending(userId, componentId, spendingId, request);
        eventCacheInvalidationService.evictEventCaches(dto.getEventId());
        return dto;
    }

    public EventSpendingDto deleteSpending(UUID userId, UUID componentId, UUID spendingId) {
        log.info("Evicting wildcard event caches due to deleted spending {} on component: {}", spendingId, componentId);
        EventSpendingDto dto = eventSpendingService.deleteSpending(userId, componentId, spendingId);
        eventCacheInvalidationService.evictEventCaches(dto.getEventId());
        return dto;
    }
}
