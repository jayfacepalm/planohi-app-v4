package com.planohi.api.service.impl;

import com.planohi.api.dto.CreateInviteeRequest;
import com.planohi.api.dto.UpdateInviteeRequest;
import com.planohi.api.dto.InviteeDto;
import com.planohi.api.dto.InviteeMetricsDto;
import com.planohi.api.dto.PublicRsvpDetailsDto;
import com.planohi.api.dto.SubmitRsvpRequest;
import com.planohi.api.dto.EventDto;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.Invitee;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.exception.FieldValidationException;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.InviteeRepository;
import com.planohi.api.service.InviteeService;
import com.planohi.api.service.S3StorageService;
import com.planohi.api.service.WorkspaceSecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InviteeServiceImpl implements InviteeService {

    private final EventRepository eventRepository;
    private final InviteeRepository inviteeRepository;
    private final S3StorageService s3StorageService;
    private final WorkspaceSecurityService workspaceSecurityService;

    @Override
    @Transactional
    public void addInvitees(UUID userId, UUID eventId, List<CreateInviteeRequest> requests) {
        log.info("Adding {} invitees to event {} by user {}", requests.size(), eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkWriteAccess(userId, eventId);

        List<Invitee> invitees = new ArrayList<>();
        for (CreateInviteeRequest request : requests) {
            invitees.add(Invitee.builder()
                    .eventId(eventId)
                    .name(request.getName())
                    .token(UUID.randomUUID().toString())
                    .allowedGuests(request.getAllowedGuests())
                    .attendingGuests(0)
                    .status("PENDING")
                    .build());
        }

        inviteeRepository.saveAll(invitees);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InviteeDto> getInvitees(UUID userId, UUID eventId, String search, Pageable pageable) {
        log.debug("Listing invitees for event {} by user {}, search='{}'", eventId, userId, search);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkReadAccess(userId, eventId);

        Page<Invitee> inviteesPage;
        if (search != null && !search.trim().isEmpty()) {
            inviteesPage = inviteeRepository.findByEventIdAndNameContainingIgnoreCase(eventId, search.trim(), pageable);
        } else {
            inviteesPage = inviteeRepository.findByEventId(eventId, pageable);
        }

        return inviteesPage.map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public InviteeMetricsDto getMetrics(UUID userId, UUID eventId) {
        log.debug("Fetching guest metrics for event {} by user {}", eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkReadAccess(userId, eventId);

        InviteeMetricsDto metrics = inviteeRepository.getMetricsByEventId(eventId);
        if (metrics == null || metrics.getTotalInvited() == 0L) {
            return InviteeMetricsDto.builder()
                    .totalInvited(0L)
                    .respondedCount(0L)
                    .acceptedCount(0L)
                    .declinedCount(0L)
                    .pendingCount(0L)
                    .totalAttendingHeadcount(0L)
                    .build();
        }
        return metrics;
    }

    @Override
    @Transactional(readOnly = true)
    public PublicRsvpDetailsDto getPublicRsvpDetails(String token) {
        log.debug("Public lookup requested for token: {}", token);
        Invitee invitee = inviteeRepository.findByToken(token)
                .orElseThrow(() -> new EntityNotFoundException("Invitation link is invalid"));

        Event event = eventRepository.findById(invitee.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        EventDto eventDto = EventDto.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .bannerUrl(s3StorageService.generatePresignedUrl(event.getBannerUrl()))
                .build();

        return PublicRsvpDetailsDto.builder()
                .inviteeName(invitee.getName())
                .allowedGuests(invitee.getAllowedGuests())
                .attendingGuests(invitee.getAttendingGuests())
                .status(invitee.getStatus())
                .event(eventDto)
                .build();
    }

    @Override
    @Transactional
    public UUID submitRsvpResponse(String token, SubmitRsvpRequest request) {
        log.info("Submitting RSVP response for token: {}, status={}, attendingGuests={}", 
                token, request.getStatus(), request.getAttendingGuests());

        Invitee invitee = inviteeRepository.findByToken(token)
                .orElseThrow(() -> new EntityNotFoundException("Invitation link is invalid"));

        Event event = eventRepository.findById(invitee.getEventId())
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        // GAP 8 (RSVP Lockout for Past Events)
        if (Instant.now().isAfter(event.getEndDate())) {
            throw new IllegalArgumentException("The RSVP window for this event is closed");
        }

        String status = request.getStatus().trim().toUpperCase();
        if (!status.equals("ACCEPTED") && !status.equals("DECLINED")) {
            throw new FieldValidationException("status", "RSVP status must be ACCEPTED or DECLINED");
        }

        if (status.equals("ACCEPTED")) {
            if (request.getAttendingGuests() < 1 || request.getAttendingGuests() > invitee.getAllowedGuests()) {
                throw new FieldValidationException("attendingGuests", 
                        "Guests count must be between 1 and " + invitee.getAllowedGuests());
            }
            invitee.setAttendingGuests(request.getAttendingGuests());
        } else {
            invitee.setAttendingGuests(0);
        }

        invitee.setStatus(status);
        invitee.setRespondedAt(Instant.now());
        inviteeRepository.saveAndFlush(invitee);

        return event.getId();
    }

    private InviteeDto mapToDto(Invitee invitee) {
        return InviteeDto.builder()
                .id(invitee.getId())
                .eventId(invitee.getEventId())
                .name(invitee.getName())
                .token(invitee.getToken())
                .allowedGuests(invitee.getAllowedGuests())
                .attendingGuests(invitee.getAttendingGuests())
                .status(invitee.getStatus())
                .respondedAt(invitee.getRespondedAt())
                .build();
    }

    @Override
    @Transactional
    public InviteeDto updateInvitee(UUID userId, UUID eventId, UUID inviteeId, UpdateInviteeRequest request) {
        log.info("Updating invitee {} for event {} by user {}", inviteeId, eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkWriteAccess(userId, eventId);

        Invitee invitee = inviteeRepository.findById(inviteeId)
                .orElseThrow(() -> new EntityNotFoundException("Invitee not found"));

        if (!invitee.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Invitee does not belong to this event");
        }

        if (request.getAllowedGuests() < invitee.getAttendingGuests()) {
            throw new FieldValidationException("allowedGuests",
                    "Allowed headcount limit cannot be lower than the already confirmed RSVP party size (" + invitee.getAttendingGuests() + ")");
        }

        invitee.setName(request.getName());
        invitee.setAllowedGuests(request.getAllowedGuests());
        inviteeRepository.saveAndFlush(invitee);

        return mapToDto(invitee);
    }

    @Override
    @Transactional
    public InviteeDto deleteInvitee(UUID userId, UUID eventId, UUID inviteeId) {
        log.info("Deleting invitee {} for event {} by user {}", inviteeId, eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkWriteAccess(userId, eventId);

        Invitee invitee = inviteeRepository.findById(inviteeId)
                .orElseThrow(() -> new EntityNotFoundException("Invitee not found"));

        if (!invitee.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Invitee does not belong to this event");
        }

        inviteeRepository.delete(invitee);
        inviteeRepository.flush();

        return mapToDto(invitee);
    }
}
