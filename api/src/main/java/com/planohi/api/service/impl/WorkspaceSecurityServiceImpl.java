package com.planohi.api.service.impl;

import com.planohi.api.entity.Event;
import com.planohi.api.entity.EventCurator;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.EventCuratorRepository;
import com.planohi.api.service.WorkspaceSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkspaceSecurityServiceImpl implements WorkspaceSecurityService {

    private final EventRepository eventRepository;
    private final EventCuratorRepository eventCuratorRepository;

    @Override
    @Transactional(readOnly = true)
    public void checkReadAccess(UUID userId, UUID eventId) {
        if (!hasReadAccess(userId, eventId)) {
            throw new IllegalArgumentException("Access Denied: You do not have permission to view this event workspace");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void checkWriteAccess(UUID userId, UUID eventId) {
        if (!hasWriteAccess(userId, eventId)) {
            throw new IllegalArgumentException("Access Denied: You do not have permission to modify this event workspace");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasReadAccess(UUID userId, UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));
        
        if (event.getUserId().equals(userId)) {
            return true;
        }

        Optional<EventCurator> curatorOpt = eventCuratorRepository.findByEventIdAndUserId(eventId, userId);
        if (curatorOpt.isPresent()) {
            EventCurator curator = curatorOpt.get();
            return "ACCEPTED".equals(curator.getStatus());
        }

        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasWriteAccess(UUID userId, UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));
        
        if (event.getUserId().equals(userId)) {
            return true;
        }

        Optional<EventCurator> curatorOpt = eventCuratorRepository.findByEventIdAndUserId(eventId, userId);
        if (curatorOpt.isPresent()) {
            EventCurator curator = curatorOpt.get();
            return "ACCEPTED".equals(curator.getStatus()) && curator.getRole() == EventCuratorRole.ORGANIZER;
        }

        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public EventCuratorRole getCuratorRole(UUID userId, UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found"));
        
        if (event.getUserId().equals(userId)) {
            return EventCuratorRole.OWNER;
        }

        Optional<EventCurator> curatorOpt = eventCuratorRepository.findByEventIdAndUserId(eventId, userId);
        if (curatorOpt.isPresent()) {
            EventCurator curator = curatorOpt.get();
            if ("ACCEPTED".equals(curator.getStatus())) {
                return curator.getRole(); // EventCuratorRole enum
            }
        }
        
        throw new IllegalArgumentException("Access Denied: You are not a member of this event workspace");
    }
}
