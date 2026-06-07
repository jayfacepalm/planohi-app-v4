package com.planohi.api.service;

import com.planohi.api.config.JwtService;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.EventCurator;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.repository.EventCuratorRepository;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.service.impl.WorkspaceSecurityServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WorkspaceSecurityServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private EventCuratorRepository eventCuratorRepository;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private WorkspaceSecurityServiceImpl workspaceSecurityService;

    private UUID userId;
    private UUID eventId;
    private String validToken;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        eventId = UUID.randomUUID();
        validToken = "header.payload.signature";
    }

    @Test
    void validateRoleToken_success_owner() {
        when(jwtService.isRoleTokenExpired(validToken)).thenReturn(false);
        when(jwtService.extractRoleUserId(validToken)).thenReturn(userId);
        when(jwtService.extractRoleEventId(validToken)).thenReturn(eventId);
        when(jwtService.extractRoleUserRole(validToken)).thenReturn("OWNER");

        Event event = mock(Event.class);
        when(event.getUserId()).thenReturn(userId);
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        assertDoesNotThrow(() -> 
            workspaceSecurityService.validateRoleToken(validToken, userId, eventId, EventCuratorRole.ORGANIZER)
        );
    }

    @Test
    void validateRoleToken_success_curator() {
        when(jwtService.isRoleTokenExpired(validToken)).thenReturn(false);
        when(jwtService.extractRoleUserId(validToken)).thenReturn(userId);
        when(jwtService.extractRoleEventId(validToken)).thenReturn(eventId);
        when(jwtService.extractRoleUserRole(validToken)).thenReturn("ORGANIZER");

        Event event = mock(Event.class);
        when(event.getUserId()).thenReturn(UUID.randomUUID()); // different user is owner
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        EventCurator curator = mock(EventCurator.class);
        when(curator.getStatus()).thenReturn("ACCEPTED");
        when(eventCuratorRepository.findByEventIdAndUserId(eventId, userId)).thenReturn(Optional.of(curator));

        assertDoesNotThrow(() -> 
            workspaceSecurityService.validateRoleToken(validToken, userId, eventId, EventCuratorRole.ORGANIZER)
        );
    }

    @Test
    void validateRoleToken_insufficientRole() {
        when(jwtService.isRoleTokenExpired(validToken)).thenReturn(false);
        when(jwtService.extractRoleUserId(validToken)).thenReturn(userId);
        when(jwtService.extractRoleEventId(validToken)).thenReturn(eventId);
        when(jwtService.extractRoleUserRole(validToken)).thenReturn("VIEWER");

        Event event = mock(Event.class);
        when(event.getUserId()).thenReturn(userId);
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            workspaceSecurityService.validateRoleToken(validToken, userId, eventId, EventCuratorRole.ORGANIZER)
        );
        assertTrue(exception.getMessage().contains("Insufficient permissions"));
    }

    @Test
    void validateRoleToken_expired() {
        when(jwtService.isRoleTokenExpired(validToken)).thenReturn(true);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            workspaceSecurityService.validateRoleToken(validToken, userId, eventId, EventCuratorRole.ORGANIZER)
        );
        assertTrue(exception.getMessage().contains("expired"));
    }

    @Test
    void validateRoleToken_userMismatch() {
        when(jwtService.isRoleTokenExpired(validToken)).thenReturn(false);
        when(jwtService.extractRoleUserId(validToken)).thenReturn(UUID.randomUUID());
        when(jwtService.extractRoleEventId(validToken)).thenReturn(eventId);
        when(jwtService.extractRoleUserRole(validToken)).thenReturn("ORGANIZER");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            workspaceSecurityService.validateRoleToken(validToken, userId, eventId, EventCuratorRole.ORGANIZER)
        );
        assertTrue(exception.getMessage().contains("User session mismatch"));
    }

    @Test
    void validateRoleToken_eventMismatch() {
        when(jwtService.isRoleTokenExpired(validToken)).thenReturn(false);
        when(jwtService.extractRoleUserId(validToken)).thenReturn(userId);
        when(jwtService.extractRoleEventId(validToken)).thenReturn(UUID.randomUUID());
        when(jwtService.extractRoleUserRole(validToken)).thenReturn("ORGANIZER");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            workspaceSecurityService.validateRoleToken(validToken, userId, eventId, EventCuratorRole.ORGANIZER)
        );
        assertTrue(exception.getMessage().contains("Event workspace mismatch"));
    }

    @Test
    void validateRoleToken_curatorRevoked() {
        when(jwtService.isRoleTokenExpired(validToken)).thenReturn(false);
        when(jwtService.extractRoleUserId(validToken)).thenReturn(userId);
        when(jwtService.extractRoleEventId(validToken)).thenReturn(eventId);
        when(jwtService.extractRoleUserRole(validToken)).thenReturn("ORGANIZER");

        Event event = mock(Event.class);
        when(event.getUserId()).thenReturn(UUID.randomUUID()); // different user is owner
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        EventCurator curator = mock(EventCurator.class);
        when(curator.getStatus()).thenReturn("REVOKED");
        when(eventCuratorRepository.findByEventIdAndUserId(eventId, userId)).thenReturn(Optional.of(curator));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            workspaceSecurityService.validateRoleToken(validToken, userId, eventId, EventCuratorRole.ORGANIZER)
        );
        assertTrue(exception.getMessage().contains("access is no longer active"));
    }

    @Test
    void validateRoleToken_notCurator() {
        when(jwtService.isRoleTokenExpired(validToken)).thenReturn(false);
        when(jwtService.extractRoleUserId(validToken)).thenReturn(userId);
        when(jwtService.extractRoleEventId(validToken)).thenReturn(eventId);
        when(jwtService.extractRoleUserRole(validToken)).thenReturn("ORGANIZER");

        Event event = mock(Event.class);
        when(event.getUserId()).thenReturn(UUID.randomUUID()); // different user is owner
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        when(eventCuratorRepository.findByEventIdAndUserId(eventId, userId)).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            workspaceSecurityService.validateRoleToken(validToken, userId, eventId, EventCuratorRole.ORGANIZER)
        );
        assertTrue(exception.getMessage().contains("not a curator"));
    }
}
