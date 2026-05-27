package com.planohi.api.service;

import com.planohi.api.dto.CreateTimelineItemRequest;
import com.planohi.api.dto.EventTimelineResponse;
import com.planohi.api.dto.TimelineItemDto;
import java.util.UUID;

public interface TimelineService {
    TimelineItemDto createTimelineItem(UUID userId, UUID eventId, CreateTimelineItemRequest request);
    EventTimelineResponse getEventTimeline(UUID userId, UUID eventId);
    TimelineItemDto toggleTimelineItem(UUID userId, UUID itemId, boolean isDone);
    UUID getEventIdForItemId(UUID itemId);
}
