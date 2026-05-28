package com.planohi.api.service.impl;

import com.planohi.api.dto.CreateEventRequest;
import com.planohi.api.dto.UpdateEventRequest;
import com.planohi.api.dto.EventDto;
import com.planohi.api.entity.Event;
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

    private static final String UPLOAD_DIR = "/app/uploads/banners";
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    @Override
    @Transactional
    public EventDto createEvent(UUID userId, CreateEventRequest request, MultipartFile bannerFile) {
        log.info("Creating event for user {} with title: {}", userId, request.getTitle());

        if (!userAccountRepository.existsById(userId)) {
            throw new EntityNotFoundException("User organizer not found");
        }

        String bannerUrl = null;
        if (bannerFile != null && !bannerFile.isEmpty()) {
            bannerUrl = saveBannerFile(bannerFile);
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

        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EventDto> getEvents(UUID userId, String search, Pageable pageable) {
        log.debug("Fetching events page with budget for user {} with search: {}", userId, search);
        Page<Object[]> results = eventRepository.findByUserIdAndSearchWithBudget(userId, search, pageable);
        return results.map(row -> {
            Event event = (Event) row[0];
            BigDecimal totalCost = (BigDecimal) row[1];
            EventDto dto = mapToDto(event);
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

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        EventDto dto = mapToDto(event);
        dto.setTotalEstimatedCost(totalCost);
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getEventBanner(UUID userId, UUID eventId) {
        log.debug("Securely loading banner for event: {}", eventId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        return readFileBytes(event.getBannerUrl());
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getEventBannerByToken(String token) {
        log.info("Securely loading banner for guest token: {}", token);
        Invitee invitee = inviteeRepository.findByToken(token)
                .orElseThrow(() -> new EntityNotFoundException("Invalid guest invitation token"));

        Event event = eventRepository.findById(invitee.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found for this invitation"));

        return readFileBytes(event.getBannerUrl());
    }

    private String saveBannerFile(MultipartFile file) {
        // Validate Size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Banner image size exceeds 5MB limit");
        }

        // Validate Type
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/png") && !contentType.equals("image/jpeg") && !contentType.equals("image/jpg"))) {
            throw new IllegalArgumentException("Only PNG and JPEG images are supported");
        }

        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String filename = UUID.randomUUID().toString() + "_" + StringUtils.cleanPath(file.getOriginalFilename());
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            log.info("Banner file stored successfully at: {}", filePath);
            return "/uploads/banners/" + filename; // Return relative web url key
        } catch (IOException e) {
            log.error("Failed to store banner file", e);
            throw new RuntimeException("Could not store image file. Please try again.");
        }
    }

    private byte[] readFileBytes(String bannerUrl) {
        if (bannerUrl == null) {
            return new byte[0];
        }
        try {
            // bannerUrl is like /uploads/banners/{filename}
            String filename = bannerUrl.replace("/uploads/banners/", "");
            Path filePath = Paths.get(UPLOAD_DIR).resolve(filename);
            if (!Files.exists(filePath)) {
                log.warn("Banner file does not exist on disk: {}", filePath);
                return new byte[0];
            }
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            log.error("Failed to read banner file", e);
            return new byte[0];
        }
    }

    private EventDto mapToDto(Event event) {
        return EventDto.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .bannerUrl(event.getBannerUrl())
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

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

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
            String newBannerUrl = saveBannerFile(bannerFile);
            event.setBannerUrl(newBannerUrl);

            // Delete old banner robustly (GAP 13)
            if (oldBannerUrl != null) {
                deleteBannerFileRobust(oldBannerUrl);
            }
        }

        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setStartDate(startDate);
        event.setEndDate(endDate);

        Event saved = eventRepository.save(event);
        log.info("Event successfully updated in DB: {}", saved.getId());

        List<Object[]> rows = eventRepository.findByIdWithBudget(eventId);
        if (!rows.isEmpty()) {
            Object[] row = rows.get(0);
            Event updatedEvent = (Event) row[0];
            BigDecimal totalCost = (BigDecimal) row[1];
            EventDto dto = mapToDto(updatedEvent);
            dto.setTotalEstimatedCost(totalCost);
            return dto;
        }

        return mapToDto(saved);
    }

    @Override
    @Transactional
    public void deleteEvent(UUID userId, UUID eventId) {
        log.info("Deleting event {} for user {}", eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You do not own this event workspace");
        }

        String bannerUrl = event.getBannerUrl();

        // Delete the event record from database (triggers cascading deletes in DB schema)
        eventRepository.delete(event);
        log.info("Event successfully deleted from DB: {}", eventId);

        // Delete banner file robustly (GAP 13)
        if (bannerUrl != null) {
            deleteBannerFileRobust(bannerUrl);
        }
    }

    private void deleteBannerFileRobust(String bannerUrl) {
        try {
            String filename = bannerUrl.replace("/uploads/banners/", "");
            Path filePath = Paths.get(UPLOAD_DIR).resolve(filename);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Banner file deleted successfully: {}", filePath);
            }
        } catch (Exception e) {
            log.warn("Failed to delete banner file robustly: {}. Error: {}", bannerUrl, e.getMessage());
        }
    }
}
