package com.planohi.api.service.impl;

import com.planohi.api.dto.CreateEventRequest;
import com.planohi.api.dto.UpdateEventRequest;
import com.planohi.api.dto.EventDto;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.UserAccount;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.entity.EventSpending;
import com.planohi.api.entity.Invitee;
import com.planohi.api.entity.TimelineItem;

import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.exception.FieldValidationException;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.EventSpendingRepository;
import com.planohi.api.repository.InviteeRepository;
import com.planohi.api.repository.TimelineItemRepository;
import com.planohi.api.repository.UserAccountRepository;
import com.planohi.api.service.EventService;
import com.planohi.api.service.S3StorageService;
import com.planohi.api.service.WorkspaceSecurityService;
import com.planohi.api.config.JwtService;
import com.planohi.api.service.ActivityLogPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final UserAccountRepository userAccountRepository;
    private final InviteeRepository inviteeRepository;
    private final TimelineItemRepository timelineItemRepository;
    private final EventSpendingRepository eventSpendingRepository;
    private final S3StorageService s3StorageService;
    private final WorkspaceSecurityService workspaceSecurityService;
    private final JwtService jwtService;
    private final ActivityLogPublisher activityLogPublisher;

    @Override
    @Transactional
    public EventDto createEvent(UUID userId, CreateEventRequest request, MultipartFile bannerFile) {
        log.info("Creating event for user {} with title: {}", userId, request.getTitle());

        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User organizer not found"));

        if (user.getRole() == com.planohi.api.enums.UserRole.NORMAL) {
            long existingCount = eventRepository.countByUserId(userId);
            if (existingCount >= 3) {
                throw new IllegalArgumentException("Normal tier accounts are limited to a maximum of 3 events. Please activate a premium voucher to lift this limit.");
            }
        }


        String bannerUrl = null;
        if (bannerFile != null && !bannerFile.isEmpty()) {
            bannerUrl = s3StorageService.uploadBanner(bannerFile);
        }

        // Handle single-day vs range dates
        Instant startDate = request.getStartDate();
        Instant endDate = request.getEndDate();

        // If dates are identical or on the same calendar day, treat as single-day: 00:00:00Z to 23:59:59Z
        if (startDate.truncatedTo(ChronoUnit.DAYS).equals(endDate.truncatedTo(ChronoUnit.DAYS))) {
            startDate = startDate.truncatedTo(ChronoUnit.DAYS);
            endDate = startDate.plus(1, ChronoUnit.DAYS).minus(1, ChronoUnit.MILLIS);
            log.info("Dates aligned for single-day event. Interval set: {} to {}", startDate, endDate);
        }

        Event event = Event.builder()
                .userId(userId)
                .title(request.getTitle())
                .description(request.getDescription())
                .startDate(startDate)
                .endDate(endDate)
                .bannerUrl(bannerUrl)
                .build();

        Event saved = eventRepository.save(event);
        log.info("Event successfully created in DB: {} with ID: {}", saved.getTitle(), saved.getId());

        activityLogPublisher.publish(userId, null, "EVENT_CREATE", "EVENT", saved.getId(), saved.getId(), "SUCCESS", java.util.Map.of("title", saved.getTitle()));

        return mapToDto(saved, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventDto> getEvents(UUID userId, String search, Pageable pageable) {
        log.debug("Fetching events page with budget for user {} with search: {}", userId, search);
        Page<Object[]> results = eventRepository.findByUserIdAndSearchWithBudget(userId, search, pageable);
        return results.map(row -> {
            Event event = (Event) row[0];
            BigDecimal totalCost = (BigDecimal) row[1];
            EventDto dto = mapToDto(event, userId);
            dto.setTotalEstimatedCost(totalCost);
            return dto;
        });
    }

    @Override
    @Transactional(readOnly = true)
    public EventDto getEventDetails(UUID userId, UUID eventId) {
        log.debug("Fetching event details with budget for ID: {}", eventId);
        List<Object[]> rows = eventRepository.findByIdWithBudget(eventId);
        if (rows.isEmpty()) {
            throw new EntityNotFoundException("Event not found");
        }

        Object[] row = rows.get(0);
        Event event = (Event) row[0];
        BigDecimal totalCost = (BigDecimal) row[1];

        workspaceSecurityService.checkReadAccess(userId, eventId);

        EventDto dto = mapToDto(event, userId);
        dto.setTotalEstimatedCost(totalCost);
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getEventBanner(UUID userId, UUID eventId) {
        log.debug("Securely loading banner for event: {}", eventId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkReadAccess(userId, eventId);

        return s3StorageService.fetchBannerBytes(event.getBannerUrl());
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getEventBannerByToken(String token) {
        log.info("Securely loading banner for guest token: {}", token);
        Invitee invitee = inviteeRepository.findByToken(token)
                .orElseThrow(() -> new EntityNotFoundException("Invalid guest invitation token"));

        Event event = eventRepository.findById(invitee.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found for this invitation"));

        return s3StorageService.fetchBannerBytes(event.getBannerUrl());
    }



    private EventDto mapToDto(Event event, UUID callerUserId) {
        EventCuratorRole role = EventCuratorRole.VIEWER;
        if (event.getUserId().equals(callerUserId)) {
            role = EventCuratorRole.OWNER;
        } else {
            try {
                role = workspaceSecurityService.getCuratorRole(callerUserId, event.getId());
            } catch (Exception e) {
                // ignore
            }
        }
        String signedRoleToken = jwtService.generateRoleToken(callerUserId, event.getId(), role);

        return EventDto.builder()
                .id(event.getId())
                .userId(event.getUserId())
                .userRole(signedRoleToken)
                .title(event.getTitle())
                .description(event.getDescription())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .bannerUrl(s3StorageService.generatePresignedUrl(event.getBannerUrl()))
                .totalEstimatedCost(BigDecimal.ZERO) // Aggregation is added in US-2.5
                .createdAt(event.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public EventDto updateEvent(UUID userId, UUID eventId, UpdateEventRequest request, MultipartFile bannerFile) {
        log.info("Updating event {} for user {}", eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkWriteAccess(userId, eventId);

        Instant startDate = request.getStartDate();
        Instant endDate = request.getEndDate();

        if (startDate.isAfter(endDate)) {
            throw new FieldValidationException("startDate", "Start date must be before or equal to end date");
        }

        // Single-day alignment logic refactored: only normalizes if start & end are mathematically identical down to millisecond
        if (startDate.equals(endDate)) {
            startDate = startDate.truncatedTo(ChronoUnit.DAYS);
            endDate = startDate.plus(1, ChronoUnit.DAYS).minus(1, ChronoUnit.MILLIS);
            log.info("Dates aligned for single-day event. Interval set: {} to {}", startDate, endDate);
        }

        // Validate boundary against existing timeline items (GAP 18: with 24-hour buffer window)
        Instant minBound = startDate.minus(24, ChronoUnit.HOURS);
        Instant maxBound = endDate.plus(24, ChronoUnit.HOURS);
        List<TimelineItem> milestones = timelineItemRepository.findByEventIdOrderByDueAtAsc(eventId);
        for (TimelineItem milestone : milestones) {
            if (milestone.getDueAt().isBefore(minBound) || milestone.getDueAt().isAfter(maxBound)) {
                throw new FieldValidationException("startDate", 
                        "New date range excludes existing milestone: '" + milestone.getTitle() + "' due at " + milestone.getDueAt());
            }
        }

        // Validate boundary against existing spendings (GAP 19)
        List<EventSpending> spendings = eventSpendingRepository.findByEventIdOrderBySpentAtAsc(eventId);
        for (EventSpending spending : spendings) {
            if (spending.getSpentAt().isBefore(startDate) || spending.getSpentAt().isAfter(endDate)) {
                throw new FieldValidationException("startDate", 
                        "New date range excludes logged spending transaction: '" + spending.getDescription() + "' spent at " + spending.getSpentAt());
            }
        }

        // Save new banner file if provided
        String oldBannerUrl = event.getBannerUrl();
        if (bannerFile != null && !bannerFile.isEmpty()) {
            String newBannerUrl = s3StorageService.uploadBanner(bannerFile);
            event.setBannerUrl(newBannerUrl);

            // Delete old banner robustly (GAP 13)
            if (oldBannerUrl != null) {
                s3StorageService.deleteBanner(oldBannerUrl);
            }
        }

        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setStartDate(startDate);
        event.setEndDate(endDate);

        Event saved = eventRepository.save(event);
        log.info("Event successfully updated in DB: {}", saved.getId());

        activityLogPublisher.publish(userId, null, "EVENT_UPDATE", "EVENT", saved.getId(), saved.getId(), "SUCCESS", java.util.Map.of("title", saved.getTitle()));

        List<Object[]> rows = eventRepository.findByIdWithBudget(eventId);
        if (!rows.isEmpty()) {
            Object[] row = rows.get(0);
            Event updatedEvent = (Event) row[0];
            BigDecimal totalCost = (BigDecimal) row[1];
            EventDto dto = mapToDto(updatedEvent, userId);
            dto.setTotalEstimatedCost(totalCost);
            return dto;
        }

        return mapToDto(saved, userId);
    }

    @Override
    @Transactional
    public void deleteEvent(UUID userId, UUID eventId) {
        log.info("Deleting event {} for user {}", eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: Only the owner of the event workspace can delete it");
        }

        String bannerUrl = event.getBannerUrl();

        // Delete the event record from database (triggers cascading deletes in DB schema)
        eventRepository.delete(event);
        log.info("Event successfully deleted from DB: {}", eventId);

        activityLogPublisher.publish(userId, null, "EVENT_DELETE", "EVENT", eventId, eventId, "SUCCESS", java.util.Map.of("title", event.getTitle()));

        // Delete banner file robustly (GAP 13)
        if (bannerUrl != null) {
            s3StorageService.deleteBanner(bannerUrl);
        }
    }
}
