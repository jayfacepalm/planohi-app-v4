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
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.quartz.TriggerKey;
import com.planohi.api.scheduler.SendAllInvitesJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.planohi.api.dto.EmailMessageDto;
import com.planohi.api.service.EmailPublisher;
import org.springframework.beans.factory.annotation.Value;
import com.planohi.api.service.ActivityLogPublisher;
import java.util.Map;
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
    private final EmailPublisher emailPublisher;
    private final Scheduler scheduler;
    private final ActivityLogPublisher activityLogPublisher;

    @Value("${app.frontend-url}")
    private String frontendUrl;

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
                    .email(request.getEmail())
                    .build());
        }

        List<Invitee> savedInvitees = inviteeRepository.saveAll(invitees);
        for (Invitee invitee : savedInvitees) {
            activityLogPublisher.publish(userId, null, "INVITEE_CREATE", "INVITEE", invitee.getId(), eventId, "SUCCESS", java.util.Map.of("name", invitee.getName(), "email", invitee.getEmail() != null ? invitee.getEmail() : ""));
        }
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
    public InviteeDto submitRsvpResponse(String token, SubmitRsvpRequest request) {
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
        Invitee saved = inviteeRepository.saveAndFlush(invitee);

        return mapToDto(saved);
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
                .email(invitee.getEmail())
                .respondedAt(invitee.getRespondedAt())
                .lastSentAt(invitee.getLastSentAt())
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
        if (request.getEmail() != null) {
            String trimmed = request.getEmail().trim();
            invitee.setEmail(trimmed.isEmpty() ? null : trimmed);
        }
        inviteeRepository.saveAndFlush(invitee);

        activityLogPublisher.publish(userId, null, "INVITEE_UPDATE", "INVITEE", invitee.getId(), eventId, "SUCCESS", java.util.Map.of("name", invitee.getName(), "email", invitee.getEmail() != null ? invitee.getEmail() : ""));
 
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

        activityLogPublisher.publish(userId, null, "INVITEE_DELETE", "INVITEE", inviteeId, eventId, "SUCCESS", java.util.Map.of("name", invitee.getName()));

        return mapToDto(invitee);
    }

    @Override
    @Transactional
    public void sendRsvpInvite(UUID userId, UUID eventId, UUID inviteeId) {
        log.info("Sending RSVP invite for invitee {} in event {} by user {}", inviteeId, eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkWriteAccess(userId, eventId);

        Invitee invitee = inviteeRepository.findById(inviteeId)
                .orElseThrow(() -> new EntityNotFoundException("Invitee not found"));

        if (!invitee.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Invitee does not belong to this event");
        }

        if (invitee.getEmail() == null || invitee.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Invitee email is not configured");
        }

        invitee.setLastSentAt(Instant.now());
        inviteeRepository.saveAndFlush(invitee);

        String rsvpLink = String.format("%s/rsvp/%s", frontendUrl, invitee.getToken());

        Map<String, Object> metadata = Map.of(
                "inviteeName", invitee.getName(),
                "eventName", event.getTitle(),
                "allowedGuests", invitee.getAllowedGuests(),
                "rsvpLink", rsvpLink
        );

        EmailMessageDto emailMessage = EmailMessageDto.builder()
                .templateId("GUEST_INVITATION")
                .recipientTos(List.of(invitee.getEmail()))
                .metadata(metadata)
                .userId(userId.toString())
                .build();

        emailPublisher.publishEmail(emailMessage);

        activityLogPublisher.publish(userId, null, "EMAIL_DISPATCH_TRIGGER", "INVITEE", inviteeId, eventId, "SUCCESS", java.util.Map.of("recipient", invitee.getEmail()));
    }

    @Override
    @Transactional
    public void sendBulkInvites(UUID userId, UUID eventId, Instant scheduledTime) {
        log.info("Request to send bulk invites for event {} by user {}, scheduledTime={}", eventId, userId, scheduledTime);
        
        eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkWriteAccess(userId, eventId);

        try {
            JobKey jobKey = JobKey.jobKey(eventId.toString(), "invite-jobs");
            TriggerKey triggerKey = TriggerKey.triggerKey(eventId.toString(), "invite-triggers");

            // Cancel/delete any existing job to guarantee idempotency and reschedule clean
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
            }

            if (scheduledTime == null || !scheduledTime.isAfter(Instant.now())) {
                log.info("Triggering bulk invitations immediately for event {}", eventId);
                executeBulkSend(userId, eventId);
            } else {
                log.info("Scheduling bulk invitations for event {} at {}", eventId, scheduledTime);
                JobDetail jobDetail = JobBuilder.newJob(SendAllInvitesJob.class)
                        .withIdentity(jobKey)
                        .usingJobData("eventId", eventId.toString())
                        .usingJobData("userId", userId.toString())
                        .storeDurably()
                        .build();

                Trigger trigger = TriggerBuilder.newTrigger()
                        .withIdentity(triggerKey)
                        .startAt(java.util.Date.from(scheduledTime))
                        .build();

                scheduler.scheduleJob(jobDetail, trigger);

                activityLogPublisher.publish(userId, null, "EMAIL_DISPATCH_SCHEDULE", "EVENT", eventId, eventId, "SUCCESS", java.util.Map.of("scheduledTime", scheduledTime.toString()));
            }
        } catch (Exception e) {
            log.error("Failed to process bulk invitation scheduling", e);
            throw new RuntimeException("Failed to process bulk invitation scheduling: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void executeBulkSend(UUID userId, UUID eventId) {
        log.info("Executing bulk invitations dispatch for event {} by user {}", eventId, userId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        workspaceSecurityService.checkWriteAccess(userId, eventId);

        List<Invitee> pendingInvitees = inviteeRepository.findByEventIdAndStatus(eventId, "PENDING");
        log.info("Found {} pending invitees to dispatch for event {}", pendingInvitees.size(), eventId);

        Instant now = Instant.now();
        List<Invitee> updatedInvitees = new ArrayList<>();

        for (Invitee invitee : pendingInvitees) {
            if (invitee.getEmail() == null || invitee.getEmail().trim().isEmpty()) {
                log.warn("Skipping invitee {} - email address not configured", invitee.getName());
                continue;
            }

            invitee.setLastSentAt(now);
            updatedInvitees.add(invitee);

            String rsvpLink = String.format("%s/rsvp/%s", frontendUrl, invitee.getToken());
            Map<String, Object> metadata = Map.of(
                    "inviteeName", invitee.getName(),
                    "eventName", event.getTitle(),
                    "allowedGuests", invitee.getAllowedGuests(),
                    "rsvpLink", rsvpLink
            );

            EmailMessageDto emailMessage = EmailMessageDto.builder()
                    .templateId("GUEST_INVITATION")
                    .recipientTos(List.of(invitee.getEmail()))
                    .metadata(metadata)
                    .userId(userId.toString())
                    .build();

            emailPublisher.publishEmail(emailMessage);
        }

        if (!updatedInvitees.isEmpty()) {
            inviteeRepository.saveAllAndFlush(updatedInvitees);
            activityLogPublisher.publish(userId, null, "EMAIL_DISPATCH_TRIGGER", "EVENT", eventId, eventId, "SUCCESS", java.util.Map.of("inviteesCount", updatedInvitees.size()));
        }
    }

    @Override
    @Transactional
    public void cancelScheduledInvites(UUID userId, UUID eventId) {
        log.info("Cancelling bulk invitation schedule for event {} by user {}", eventId, userId);

        workspaceSecurityService.checkWriteAccess(userId, eventId);

        try {
            JobKey jobKey = JobKey.jobKey(eventId.toString(), "invite-jobs");
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
                log.info("Unscheduled and deleted job for event {}", eventId);
                activityLogPublisher.publish(userId, null, "EMAIL_DISPATCH_CANCEL", "EVENT", eventId, eventId, "SUCCESS", java.util.Map.of());
            }
        } catch (Exception e) {
            log.error("Failed to cancel scheduled invitations", e);
            throw new RuntimeException("Failed to cancel scheduled invitations: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Instant getScheduledInvitesTime(UUID userId, UUID eventId) {
        // Read access check
        workspaceSecurityService.getCuratorRole(userId, eventId);

        try {
            JobKey jobKey = JobKey.jobKey(eventId.toString(), "invite-jobs");
            if (scheduler.checkExists(jobKey)) {
                List<? extends Trigger> triggers = scheduler.getTriggersOfJob(jobKey);
                if (triggers != null && !triggers.isEmpty()) {
                    java.util.Date nextFireTime = triggers.get(0).getNextFireTime();
                    if (nextFireTime != null) {
                        return nextFireTime.toInstant();
                    }
                }
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to retrieve scheduled invitation time", e);
            return null;
        }
    }
}
