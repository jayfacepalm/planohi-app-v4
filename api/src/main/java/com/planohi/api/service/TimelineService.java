package com.planohi.api.service;

import com.planohi.api.dto.CreateTimelineItemRequest;
import com.planohi.api.dto.EventTimelineResponse;
import com.planohi.api.dto.TimelineItemDto;
import com.planohi.api.dto.UpdateTimelineItemRequest;
import java.util.UUID;

public interface TimelineService {
    TimelineItemDto createTimelineItem(UUID userId, UUID eventId, CreateTimelineItemRequest request);
    EventTimelineResponse getEventTimeline(UUID userId, UUID eventId);
    EventTimelineResponse getEventTimelineInternal(UUID eventId);
    TimelineItemDto toggleTimelineItem(UUID userId, UUID itemId, boolean isDone);
    TimelineItemDto updateTimelineItem(UUID userId, UUID itemId, UpdateTimelineItemRequest request);
    void deleteTimelineItem(UUID userId, UUID itemId);
    UUID getEventIdForItemId(UUID itemId);
}
