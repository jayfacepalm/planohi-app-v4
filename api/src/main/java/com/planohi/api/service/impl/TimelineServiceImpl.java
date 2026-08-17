package com.planohi.api.service.impl;

import com.planohi.api.dto.CreateTimelineItemRequest;
import com.planohi.api.dto.EventTimelineResponse;
import com.planohi.api.dto.TimelineItemDto;
import com.planohi.api.dto.UpdateTimelineItemRequest;
import com.planohi.api.dto.ChangeProposalResponseDto;
import com.planohi.api.enums.ChangeProposalAction;
import com.planohi.api.enums.ChangeProposalTarget;
import com.planohi.api.entity.Event;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.entity.TimelineItem;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.exception.FieldValidationException;
import com.planohi.api.exception.ProposalSubmittedException;
import com.planohi.api.entity.EventSpending;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.EventSpendingRepository;
import com.planohi.api.repository.TimelineItemRepository;
import com.planohi.api.service.ChangeProposalService;
import com.planohi.api.service.TimelineService;
import com.planohi.api.service.WorkspaceSecurityService;
import com.planohi.api.service.ActivityLogPublisher;
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
    private final EventSpendingRepository eventSpendingRepository;
    private final WorkspaceSecurityService workspaceSecurityService;
    private final ChangeProposalService changeProposalService;
    private final ActivityLogPublisher activityLogPublisher;

    @Override
    @Transactional
    public TimelineItemDto createTimelineItem(UUID userId, UUID eventId, CreateTimelineItemRequest request) {
        log.info("Creating timeline item for event {} by user {}", eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        EventCuratorRole role = workspaceSecurityService.getCuratorRole(userId, eventId);
        if (role == EventCuratorRole.VIEWER) {
            throw new IllegalArgumentException("Access Denied: Viewers cannot modify event timeline");
        }

        // Apply a 24-hour buffer window to due date comparisons to accommodate timezone offsets
        Instant minBound = event.getStartDate().minus(24, ChronoUnit.HOURS);
        Instant maxBound = event.getEndDate().plus(24, ChronoUnit.HOURS);

        if (request.getDueAt().isBefore(minBound) || request.getDueAt().isAfter(maxBound)) {
            throw new FieldValidationException("dueAt", "Due date must be within the event's start and end date boundaries");
        }

        if (role == EventCuratorRole.COLLABORATOR) {
            ChangeProposalResponseDto proposal = changeProposalService.createProposal(
                    eventId,
                    userId,
                    ChangeProposalTarget.TIMELINE_ITEM,
                    ChangeProposalAction.CREATE,
                    null,
                    request
            );
            throw new ProposalSubmittedException(proposal);
        }

        TimelineItem item = TimelineItem.builder()
                .eventId(eventId)
                .title(request.getTitle())
                .dueAt(request.getDueAt())
                .isDone(false)
                .build();

        TimelineItem saved = timelineItemRepository.save(item);
        log.info("Timeline item created successfully with ID: {}", saved.getId());

        if (request.getSpending() != null) {
            EventSpending spending = EventSpending.builder()
                    .componentId(request.getSpending().getComponentId())
                    .description(request.getSpending().getDescription())
                    .amount(request.getSpending().getAmount())
                    .spentAt(saved.getDueAt())
                    .build();
            EventSpending savedSpending = eventSpendingRepository.save(spending);
            log.info("Timeline associated spending recorded successfully with ID: {}", savedSpending.getId());

            activityLogPublisher.publish(userId, null, "SPENDING_CREATE", "SPENDING", savedSpending.getId(), eventId, "SUCCESS", java.util.Map.of("description", savedSpending.getDescription(), "amount", savedSpending.getAmount(), "componentId", savedSpending.getComponentId()));
        }

        activityLogPublisher.publish(userId, null, "TIMELINE_ITEM_CREATE", "TIMELINE_ITEM", saved.getId(), eventId, "SUCCESS", java.util.Map.of("title", saved.getTitle(), "dueAt", saved.getDueAt().toString()));

        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public EventTimelineResponse getEventTimeline(UUID userId, UUID eventId) {
        log.info("Fetching timeline for event {} by user {}", eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkReadAccess(userId, eventId);

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

        EventCuratorRole role = workspaceSecurityService.getCuratorRole(userId, event.getId());
        if (role == EventCuratorRole.VIEWER) {
            throw new IllegalArgumentException("Access Denied: Viewers cannot modify event timeline");
        }

        if (role == EventCuratorRole.COLLABORATOR) {
            // Include isDone inside proposedData for proposal
            ChangeProposalResponseDto proposal = changeProposalService.createProposal(
                    event.getId(),
                    userId,
                    ChangeProposalTarget.TIMELINE_ITEM,
                    ChangeProposalAction.UPDATE,
                    itemId,
                    java.util.Map.of("isDone", isDone)
            );
            throw new ProposalSubmittedException(proposal);
        }

        item.setDone(isDone);
        TimelineItem saved = timelineItemRepository.saveAndFlush(item);
        log.info("Timeline item {} status updated successfully to {}", itemId, isDone);

        activityLogPublisher.publish(userId, null, "TIMELINE_ITEM_TOGGLE", "TIMELINE_ITEM", saved.getId(), event.getId(), "SUCCESS", java.util.Map.of("title", saved.getTitle(), "isDone", isDone));

        return mapToDto(saved);
    }

    @Override
    @Transactional
    public UUID getEventIdForItemId(UUID itemId) {
        TimelineItem item = timelineItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Timeline item not found"));
        return item.getEventId();
    }

    @Override
    @Transactional
    public TimelineItemDto updateTimelineItem(UUID userId, UUID itemId, UpdateTimelineItemRequest request) {
        log.info("Updating timeline item {} by user {}", itemId, userId);

        TimelineItem item = timelineItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Timeline item not found"));

        Event event = eventRepository.findById(item.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        EventCuratorRole role = workspaceSecurityService.getCuratorRole(userId, event.getId());
        if (role == EventCuratorRole.VIEWER) {
            throw new IllegalArgumentException("Access Denied: Viewers cannot modify event timeline");
        }

        // Apply a 24-hour buffer window to due date comparisons to accommodate timezone offsets
        Instant minBound = event.getStartDate().minus(24, ChronoUnit.HOURS);
        Instant maxBound = event.getEndDate().plus(24, ChronoUnit.HOURS);

        if (request.getDueAt().isBefore(minBound) || request.getDueAt().isAfter(maxBound)) {
            throw new FieldValidationException("dueAt", "Due date must be within the event's start and end date boundaries");
        }

        if (role == EventCuratorRole.COLLABORATOR) {
            ChangeProposalResponseDto proposal = changeProposalService.createProposal(
                    event.getId(),
                    userId,
                    ChangeProposalTarget.TIMELINE_ITEM,
                    ChangeProposalAction.UPDATE,
                    itemId,
                    request
            );
            throw new ProposalSubmittedException(proposal);
        }

        item.setTitle(request.getTitle());
        item.setDueAt(request.getDueAt());
        TimelineItem saved = timelineItemRepository.save(item);
        log.info("Timeline item {} updated successfully", itemId);

        activityLogPublisher.publish(userId, null, "TIMELINE_ITEM_UPDATE", "TIMELINE_ITEM", saved.getId(), event.getId(), "SUCCESS", java.util.Map.of("title", saved.getTitle(), "dueAt", saved.getDueAt().toString()));

        return mapToDto(saved);
    }

    @Override
    @Transactional
    public void deleteTimelineItem(UUID userId, UUID itemId) {
        log.info("Deleting timeline item {} by user {}", itemId, userId);

        TimelineItem item = timelineItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Timeline item not found"));

        Event event = eventRepository.findById(item.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        EventCuratorRole role = workspaceSecurityService.getCuratorRole(userId, event.getId());
        if (role == EventCuratorRole.VIEWER) {
            throw new IllegalArgumentException("Access Denied: Viewers cannot modify event timeline");
        }

        if (role == EventCuratorRole.COLLABORATOR) {
            ChangeProposalResponseDto proposal = changeProposalService.createProposal(
                    event.getId(),
                    userId,
                    ChangeProposalTarget.TIMELINE_ITEM,
                    ChangeProposalAction.DELETE,
                    itemId,
                    null
            );
            throw new ProposalSubmittedException(proposal);
        }

        timelineItemRepository.delete(item);
        log.info("Timeline item {} deleted successfully", itemId);

        activityLogPublisher.publish(userId, null, "TIMELINE_ITEM_DELETE", "TIMELINE_ITEM", itemId, event.getId(), "SUCCESS", java.util.Map.of("title", item.getTitle()));
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
