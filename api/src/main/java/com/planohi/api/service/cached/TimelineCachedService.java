package com.planohi.api.service.cached;

import com.planohi.api.dto.CreateTimelineItemRequest;
import com.planohi.api.dto.EventTimelineResponse;
import com.planohi.api.dto.TimelineItemDto;
import com.planohi.api.dto.UpdateTimelineItemRequest;
import com.planohi.api.service.TimelineService;
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
public class TimelineCachedService {

    private final TimelineService timelineService;
    private final EventCacheInvalidationService eventCacheInvalidationService;
    private final WorkspaceSecurityService workspaceSecurityService;

    @Lazy
    @Autowired
    private TimelineCachedService self;

    public EventTimelineResponse getEventTimeline(UUID userId, UUID eventId) {
        workspaceSecurityService.checkReadAccess(userId, eventId);
        return self.getEventTimelineCache(eventId);
    }

    @Cacheable(value = "event_timeline", key = "#eventId.toString()")
    public EventTimelineResponse getEventTimelineCache(UUID eventId) {
        log.info("Cache miss: fetching timeline for event: {}", eventId);
        // We pass a dummy UUID because access check is already done by the wrapper.
        // Actually, let's just pass null or the eventId, but TimelineServiceImpl.getEventTimeline(userId, eventId)
        // DOES check access. Let's add getEventTimelineInternal(UUID eventId) in TimelineService.
        return timelineService.getEventTimelineInternal(eventId);
    }

    public TimelineItemDto createTimelineItem(UUID userId, UUID eventId, CreateTimelineItemRequest request) {
        log.info("Evicting caches due to new timeline item in event: {}", eventId);
        TimelineItemDto dto = timelineService.createTimelineItem(userId, eventId, request);
        eventCacheInvalidationService.evictEventCaches(eventId);
        return dto;
    }

    public TimelineItemDto toggleTimelineItem(UUID userId, UUID itemId, boolean isDone) {
        log.info("Evicting event_timeline cache due to status toggle for item: {}", itemId);
        TimelineItemDto dto = timelineService.toggleTimelineItem(userId, itemId, isDone);
        eventCacheInvalidationService.evictEventCaches(dto.getEventId());
        return dto;
    }

    public TimelineItemDto updateTimelineItem(UUID userId, UUID itemId, UpdateTimelineItemRequest request) {
        log.info("Evicting event_timeline cache due to details update for item: {}", itemId);
        TimelineItemDto dto = timelineService.updateTimelineItem(userId, itemId, request);
        eventCacheInvalidationService.evictEventCaches(dto.getEventId());
        return dto;
    }

    public void deleteTimelineItem(UUID userId, UUID itemId, UUID eventId) {
        log.info("Evicting event_timeline cache for event {} due to deletion of item: {}", eventId, itemId);
        timelineService.deleteTimelineItem(userId, itemId);
        eventCacheInvalidationService.evictEventCaches(eventId);
    }
}
