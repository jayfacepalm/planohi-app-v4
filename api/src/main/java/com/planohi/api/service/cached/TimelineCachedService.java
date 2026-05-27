package com.planohi.api.service.cached;

import com.planohi.api.dto.CreateTimelineItemRequest;
import com.planohi.api.dto.EventTimelineResponse;
import com.planohi.api.dto.TimelineItemDto;
import com.planohi.api.service.TimelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TimelineCachedService {

    private final TimelineService timelineService;

    @Cacheable(value = "event_timeline", key = "#userId.toString() + ':' + #eventId.toString()")
    public EventTimelineResponse getEventTimeline(UUID userId, UUID eventId) {
        log.info("Cache miss: fetching timeline for event: {}", eventId);
        return timelineService.getEventTimeline(userId, eventId);
    }

    @CacheEvict(value = "event_timeline", key = "#userId.toString() + ':' + #eventId.toString()")
    public TimelineItemDto createTimelineItem(UUID userId, UUID eventId, CreateTimelineItemRequest request) {
        log.info("Evicting event_timeline cache due to new timeline item in event: {}", eventId);
        return timelineService.createTimelineItem(userId, eventId, request);
    }

    @CacheEvict(value = "event_timeline", key = "#userId.toString() + ':' + #result.eventId.toString()")
    public TimelineItemDto toggleTimelineItem(UUID userId, UUID itemId, boolean isDone) {
        log.info("Evicting event_timeline cache due to status toggle for item: {}", itemId);
        return timelineService.toggleTimelineItem(userId, itemId, isDone);
    }
}
