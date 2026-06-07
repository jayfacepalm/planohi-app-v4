package com.planohi.api.service.impl;

import com.planohi.api.entity.Event;
import com.planohi.api.entity.EventCurator;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.EventCuratorRepository;
import com.planohi.api.service.WorkspaceSecurityService;
import com.planohi.api.config.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;

@Service
@RequiredArgsConstructor
public class WorkspaceSecurityServiceImpl implements WorkspaceSecurityService {

    private static final String EVENT_NOT_FOUND = "Event not found";
    private static final String STATUS_ACCEPTED = "ACCEPTED";

    private final EventRepository eventRepository;
    private final EventCuratorRepository eventCuratorRepository;
    private final JwtService jwtService;
    private WorkspaceSecurityService self;

    @Autowired
    public void setSelf(@Lazy WorkspaceSecurityService self) {
        this.self = self;
    }

    @Override
    @Transactional(readOnly = true)
    public void checkReadAccess(UUID userId, UUID eventId) {
        if (!self.hasReadAccess(userId, eventId)) {
            throw new IllegalArgumentException("Access Denied: You do not have permission to view this event workspace");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void checkWriteAccess(UUID userId, UUID eventId) {
        if (!self.hasWriteAccess(userId, eventId)) {
            throw new IllegalArgumentException("Access Denied: You do not have permission to modify this event workspace");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasReadAccess(UUID userId, UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException(EVENT_NOT_FOUND));
        
        if (event.getUserId().equals(userId)) {
            return true;
        }

        Optional<EventCurator> curatorOpt = eventCuratorRepository.findByEventIdAndUserId(eventId, userId);
        if (curatorOpt.isPresent()) {
            EventCurator curator = curatorOpt.get();
            return STATUS_ACCEPTED.equals(curator.getStatus());
        }

        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasWriteAccess(UUID userId, UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException(EVENT_NOT_FOUND));
        
        if (event.getUserId().equals(userId)) {
            return true;
        }

        Optional<EventCurator> curatorOpt = eventCuratorRepository.findByEventIdAndUserId(eventId, userId);
        if (curatorOpt.isPresent()) {
            EventCurator curator = curatorOpt.get();
            return STATUS_ACCEPTED.equals(curator.getStatus()) && curator.getRole() == EventCuratorRole.ORGANIZER;
        }

        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public EventCuratorRole getCuratorRole(UUID userId, UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException(EVENT_NOT_FOUND));
        
        if (event.getUserId().equals(userId)) {
            return EventCuratorRole.OWNER;
        }

        Optional<EventCurator> curatorOpt = eventCuratorRepository.findByEventIdAndUserId(eventId, userId);
        if (curatorOpt.isPresent()) {
            EventCurator curator = curatorOpt.get();
            if (STATUS_ACCEPTED.equals(curator.getStatus())) {
                return curator.getRole(); // EventCuratorRole enum
            }
        }
        
        throw new IllegalArgumentException("Access Denied: You are not a member of this event workspace");
    }

    @Override
    @Transactional(readOnly = true)
    public void validateRoleToken(String roleToken, UUID userId, UUID eventId, EventCuratorRole requiredMinRole) {
        if (roleToken == null || roleToken.isBlank()) {
            throw new IllegalArgumentException("Access Denied: Missing role validation token");
        }

        try {
            if (jwtService.isRoleTokenExpired(roleToken)) {
                throw new IllegalArgumentException("Access Denied: Role validation token has expired");
            }

            UUID tokenUserId = jwtService.extractRoleUserId(roleToken);
            UUID tokenEventId = jwtService.extractRoleEventId(roleToken);
            String tokenRoleStr = jwtService.extractRoleUserRole(roleToken);

            if (!userId.equals(tokenUserId)) {
                throw new IllegalArgumentException("Access Denied: User session mismatch");
            }

            if (!eventId.equals(tokenEventId)) {
                throw new IllegalArgumentException("Access Denied: Event workspace mismatch");
            }

            // Real-time revocation database check
            Event event = eventRepository.findById(eventId)
                    .orElseThrow(() -> new EntityNotFoundException(EVENT_NOT_FOUND));
            if (!event.getUserId().equals(userId)) {
                EventCurator curator = eventCuratorRepository.findByEventIdAndUserId(eventId, userId)
                        .orElseThrow(() -> new IllegalArgumentException("Access Denied: You are not a curator of this event workspace"));
                if (!STATUS_ACCEPTED.equals(curator.getStatus())) {
                    throw new IllegalArgumentException("Access Denied: Your curator access is no longer active");
                }
            }

            EventCuratorRole tokenRole = EventCuratorRole.valueOf(tokenRoleStr);
            if (tokenRole.ordinal() > requiredMinRole.ordinal()) {
                throw new IllegalArgumentException("Access Denied: Insufficient permissions for this action");
            }

        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Access Denied: Invalid role validation token");
        }
    }
}
