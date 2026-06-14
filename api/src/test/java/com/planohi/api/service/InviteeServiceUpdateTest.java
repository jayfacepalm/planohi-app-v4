package com.planohi.api.service;

import com.planohi.api.dto.UpdateInviteeRequest;
import com.planohi.api.entity.Event;
import com.planohi.api.entity.Invitee;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.InviteeRepository;
import com.planohi.api.service.impl.InviteeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quartz.Scheduler;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InviteeServiceUpdateTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private InviteeRepository inviteeRepository;

    @Mock
    private S3StorageService s3StorageService;

    @Mock
    private WorkspaceSecurityService workspaceSecurityService;

    @Mock
    private EmailPublisher emailPublisher;

    @Mock
    private Scheduler scheduler;

    @Mock
    private ActivityLogPublisher activityLogPublisher;

    @InjectMocks
    private InviteeServiceImpl inviteeService;

    private UUID userId;
    private UUID eventId;
    private UUID inviteeId;
    private Event event;
    private Invitee invitee;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        eventId = UUID.randomUUID();
        inviteeId = UUID.randomUUID();

        event = Event.builder().id(eventId).build();
        invitee = Invitee.builder()
                .id(inviteeId)
                .eventId(eventId)
                .name("Old Name")
                .allowedGuests(2)
                .attendingGuests(0)
                .email("original@example.com")
                .build();
    }

    @Test
    void testUpdateInvitee_emailOmitted() {
        UpdateInviteeRequest request = UpdateInviteeRequest.builder()
                .name("New Name")
                .allowedGuests(3)
                .email(null) // Omitted
                .build();

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(inviteeRepository.findById(inviteeId)).thenReturn(Optional.of(invitee));

        inviteeService.updateInvitee(userId, eventId, inviteeId, request);

        assertEquals("New Name", invitee.getName());
        assertEquals(3, invitee.getAllowedGuests());
        assertEquals("original@example.com", invitee.getEmail()); // Kept original
        verify(inviteeRepository).saveAndFlush(invitee);
    }

    @Test
    void testUpdateInvitee_emailCleared() {
        UpdateInviteeRequest request = UpdateInviteeRequest.builder()
                .name("New Name")
                .allowedGuests(3)
                .email(" ") // Cleared (whitespace should be trimmed to empty string and set to null)
                .build();

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(inviteeRepository.findById(inviteeId)).thenReturn(Optional.of(invitee));

        inviteeService.updateInvitee(userId, eventId, inviteeId, request);

        assertEquals("New Name", invitee.getName());
        assertEquals(3, invitee.getAllowedGuests());
        assertNull(invitee.getEmail()); // Set to null
        verify(inviteeRepository).saveAndFlush(invitee);
    }

    @Test
    void testUpdateInvitee_emailChanged() {
        UpdateInviteeRequest request = UpdateInviteeRequest.builder()
                .name("New Name")
                .allowedGuests(3)
                .email("new@example.com") // Changed
                .build();

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));
        when(inviteeRepository.findById(inviteeId)).thenReturn(Optional.of(invitee));

        inviteeService.updateInvitee(userId, eventId, inviteeId, request);

        assertEquals("New Name", invitee.getName());
        assertEquals(3, invitee.getAllowedGuests());
        assertEquals("new@example.com", invitee.getEmail()); // Updated
        verify(inviteeRepository).saveAndFlush(invitee);
    }
}
