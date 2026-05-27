package com.planohi.api.service.impl;

import com.planohi.api.dto.CreateTimelineItemRequest;
import com.planohi.api.dto.EventTimelineResponse;
import com.planohi.api.dto.TimelineItemDto;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.TimelineItem;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.exception.FieldValidationException;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.TimelineItemRepository;
import com.planohi.api.service.TimelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TimelineServiceImpl implements TimelineService {

    private final EventRepository eventRepository;
    private final TimelineItemRepository timelineItemRepository;

    @Override
    @Transactional
    public TimelineItemDto createTimelineItem(UUID userId, UUID eventId, CreateTimelineItemRequest request) {
        log.info("Creating timeline item for event {} by user {}", eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        // Apply a 24-hour buffer window to due date comparisons to accommodate timezone offsets
        Instant minBound = event.getStartDate().minus(24, ChronoUnit.HOURS);
        Instant maxBound = event.getEndDate().plus(24, ChronoUnit.HOURS);

        if (request.getDueAt().isBefore(minBound) || request.getDueAt().isAfter(maxBound)) {
            throw new FieldValidationException("dueAt", "Due date must be within the event's start and end date boundaries");
        }

        TimelineItem item = TimelineItem.builder()
                .eventId(eventId)
                .title(request.getTitle())
                .dueAt(request.getDueAt())
                .isDone(false)
                .build();

        TimelineItem saved = timelineItemRepository.save(item);
        log.info("Timeline item created successfully with ID: {}", saved.getId());

        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public EventTimelineResponse getEventTimeline(UUID userId, UUID eventId) {
        log.info("Fetching timeline for event {} by user {}", eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        List<TimelineItem> items = timelineItemRepository.findByEventIdOrderByDueAtAsc(eventId);

        List<TimelineItemDto> dtos = items.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        long completedCount = dtos.stream().filter(TimelineItemDto::isDone).count();
        long totalCount = dtos.size();

        return EventTimelineResponse.builder()
                .completedCount(completedCount)
                .totalCount(totalCount)
                .items(dtos)
                .build();
    }

    @Override
    @Transactional
    public TimelineItemDto toggleTimelineItem(UUID userId, UUID itemId, boolean isDone) {
        log.info("Toggling timeline item {} status to {} by user {}", itemId, isDone, userId);

        TimelineItem item = timelineItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Timeline item not found"));

        Event event = eventRepository.findById(item.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        item.setDone(isDone);
        TimelineItem saved = timelineItemRepository.saveAndFlush(item);
        log.info("Timeline item {} status updated successfully to {}", itemId, isDone);

        return mapToDto(saved);
    }

    @Override
    @Transactional
    public UUID getEventIdForItemId(UUID itemId) {
        TimelineItem item = timelineItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Timeline item not found"));
        return item.getEventId();
    }

    private TimelineItemDto mapToDto(TimelineItem item) {
        return TimelineItemDto.builder()
                .id(item.getId())
                .eventId(item.getEventId())
                .title(item.getTitle())
                .dueAt(item.getDueAt())
                .isDone(item.isDone())
                .build();
    }
}
