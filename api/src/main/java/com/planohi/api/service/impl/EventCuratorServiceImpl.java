package com.planohi.api.service.impl;

import com.planohi.api.dto.EventCuratorResponseDto;
import com.planohi.api.dto.EventInvitationResponseDto;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.EventCurator;
import com.planohi.api.enums.EventCuratorRole;
import java.util.ArrayList;
import com.planohi.api.entity.UserAccount;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.EventCuratorRepository;
import com.planohi.api.repository.UserAccountRepository;
import com.planohi.api.service.EventCuratorService;
import com.planohi.api.service.WorkspaceSecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventCuratorServiceImpl implements EventCuratorService {

    private final EventRepository eventRepository;
    private final EventCuratorRepository eventCuratorRepository;
    private final UserAccountRepository userAccountRepository;
    private final WorkspaceSecurityService workspaceSecurityService;

    @Override
    @Transactional
    public EventCuratorResponseDto inviteCurator(UUID requesterId, UUID eventId, String email, EventCuratorRole role) {
        log.info("User {} inviting curator {} to event {} with role {}", requesterId, email, eventId, role);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        // Validate requester is Owner or Organizer
        boolean isOwner = event.getUserId().equals(requesterId);
        boolean isOrganizer = false;
        if (!isOwner) {
            Optional<EventCurator> reqCurator = eventCuratorRepository.findByEventIdAndUserId(eventId, requesterId);
            isOrganizer = reqCurator.isPresent() && 
                          "ACCEPTED".equals(reqCurator.get().getStatus()) && 
                          EventCuratorRole.ORGANIZER == reqCurator.get().getRole();
        }
        if (!isOwner && !isOrganizer) {
            throw new IllegalArgumentException("Access Denied: Only event Owner or Organizer can manage curators");
        }

        // Validate role input - block OWNER role invitations
        if (role == EventCuratorRole.OWNER) {
            throw new IllegalArgumentException("Cannot invite a curator with the OWNER role");
        }

        // Find invitee
        UserAccount invitee = userAccountRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new EntityNotFoundException("User not found with email: " + email));

        // Owner self-invite block
        if (event.getUserId().equals(invitee.getId())) {
            throw new IllegalArgumentException("The owner of the event is already a member and cannot be invited as a curator");
        }

        // Check duplicates
        Optional<EventCurator> existing = eventCuratorRepository.findByEventIdAndUserId(eventId, invitee.getId());
        if (existing.isPresent()) {
            throw new IllegalArgumentException("User is already a curator or has a pending invitation for this event");
        }

        EventCurator curator = EventCurator.builder()
                .eventId(eventId)
                .userId(invitee.getId())
                .role(role)
                .status("PENDING")
                .build();

        EventCurator saved = eventCuratorRepository.save(curator);
        log.info("Successfully created curator invitation: {}", saved.getId());

        return EventCuratorResponseDto.builder()
                .id(saved.getId())
                .eventId(saved.getEventId())
                .userId(saved.getUserId())
                .email(invitee.getEmail())
                .alias(invitee.getAlias())
                .role(saved.getRole())
                .status(saved.getStatus())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventCuratorResponseDto> getCurators(UUID requesterId, UUID eventId) {
        log.info("Fetching curators for event {} by user {}", eventId, requesterId);

        // Ensure requester has read access
        workspaceSecurityService.checkReadAccess(requesterId, eventId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        UserAccount owner = userAccountRepository.findById(event.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("Event owner not found"));

        List<EventCuratorResponseDto> list = new ArrayList<>();
        list.add(EventCuratorResponseDto.builder()
                .id(owner.getId()) // Use owner's user ID as their curator key
                .eventId(eventId)
                .userId(owner.getId())
                .email(owner.getEmail())
                .alias(owner.getAlias())
                .role(EventCuratorRole.OWNER)
                .status("ACCEPTED")
                .build());

        List<Object[]> results = eventCuratorRepository.findCuratorsWithUserDetails(eventId);
        List<EventCuratorResponseDto> curators = results.stream().map(row -> {
            EventCurator c = (EventCurator) row[0];
            String email = (String) row[1];
            String alias = (String) row[2];
            return EventCuratorResponseDto.builder()
                    .id(c.getId())
                    .eventId(c.getEventId())
                    .userId(c.getUserId())
                    .email(email)
                    .alias(alias)
                    .role(c.getRole())
                    .status(c.getStatus())
                    .build();
        }).collect(Collectors.toList());

        list.addAll(curators);
        return list;
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "events_list", allEntries = true),
        @CacheEvict(value = "events_detail", allEntries = true)
    })
    public EventCuratorResponseDto updateCuratorRole(UUID requesterId, UUID eventId, UUID curatorId, EventCuratorRole role) {
        log.info("Updating role for curator {} in event {} by user {}", curatorId, eventId, requesterId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        // Validate requester is Owner or Organizer
        boolean isOwner = event.getUserId().equals(requesterId);
        boolean isOrganizer = false;
        if (!isOwner) {
            Optional<EventCurator> reqCurator = eventCuratorRepository.findByEventIdAndUserId(eventId, requesterId);
            isOrganizer = reqCurator.isPresent() && 
                          "ACCEPTED".equals(reqCurator.get().getStatus()) && 
                          EventCuratorRole.ORGANIZER == reqCurator.get().getRole();
        }
        if (!isOwner && !isOrganizer) {
            throw new IllegalArgumentException("Access Denied: Only event Owner or Organizer can manage curators");
        }

        // Validate role input - block OWNER role promotions/demotions
        if (role == EventCuratorRole.OWNER) {
            throw new IllegalArgumentException("Cannot update curator role to OWNER");
        }

        EventCurator curator = eventCuratorRepository.findById(curatorId)
                .orElseThrow(() -> new EntityNotFoundException("Curator not found"));

        if (!curator.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Curator does not belong to this event");
        }

        curator.setRole(role);
        EventCurator saved = eventCuratorRepository.save(curator);

        UserAccount invitee = userAccountRepository.findById(curator.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        return EventCuratorResponseDto.builder()
                .id(saved.getId())
                .eventId(saved.getEventId())
                .userId(saved.getUserId())
                .email(invitee.getEmail())
                .alias(invitee.getAlias())
                .role(saved.getRole())
                .status(saved.getStatus())
                .build();
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "events_list", allEntries = true),
        @CacheEvict(value = "events_detail", allEntries = true),
        @CacheEvict(value = "event_budget_summary", allEntries = true),
        @CacheEvict(value = "event_components", allEntries = true),
        @CacheEvict(value = "event_timeline", allEntries = true),
        @CacheEvict(value = "event_invitees", allEntries = true)
    })
    public void revokeCuratorAccess(UUID requesterId, UUID eventId, UUID curatorId) {
        log.info("Revoking curator {} from event {} by user {}", curatorId, eventId, requesterId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));

        // Validate requester is Owner (revoke access is exclusive to Owner)
        boolean isOwner = event.getUserId().equals(requesterId);
        if (!isOwner) {
            throw new IllegalArgumentException("Access Denied: Only the event Owner can revoke curator access");
        }

        EventCurator curator = eventCuratorRepository.findById(curatorId)
                .orElseThrow(() -> new EntityNotFoundException("Curator not found"));

        if (!curator.getEventId().equals(eventId)) {
            throw new IllegalArgumentException("Curator does not belong to this event");
        }

        eventCuratorRepository.delete(curator);
        log.info("Successfully revoked curator: {}", curatorId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventInvitationResponseDto> getMyInvitations(UUID userId) {
        log.info("Fetching invitations for user {}", userId);

        List<Object[]> results = eventCuratorRepository.findInvitationsWithDetails(userId, "PENDING");
        return results.stream().map(row -> {
            EventCurator c = (EventCurator) row[0];
            String title = (String) row[1];
            String inviterAlias = (String) row[2];
            return EventInvitationResponseDto.builder()
                    .id(c.getId())
                    .eventId(c.getEventId())
                    .eventTitle(title)
                    .inviterAlias(inviterAlias)
                    .role(c.getRole())
                    .status(c.getStatus())
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "events_list", allEntries = true),
        @CacheEvict(value = "events_detail", allEntries = true)
    })
    public void respondToInvitation(UUID userId, UUID invitationId, boolean accept) {
        log.info("User {} responding to invitation {}: accept={}", userId, invitationId, accept);

        EventCurator curator = eventCuratorRepository.findById(invitationId)
                .orElseThrow(() -> new EntityNotFoundException("Invitation not found"));

        if (!curator.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Access Denied: You cannot respond to this invitation");
        }

        if (!"PENDING".equals(curator.getStatus())) {
            throw new IllegalArgumentException("Invitation has already been responded to");
        }

        if (accept) {
            curator.setStatus("ACCEPTED");
            eventCuratorRepository.save(curator);
            log.info("Invitation accepted: {}", invitationId);
        } else {
            eventCuratorRepository.delete(curator);
            log.info("Invitation declined and removed: {}", invitationId);
        }
    }
}
