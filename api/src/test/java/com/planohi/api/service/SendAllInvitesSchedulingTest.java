package com.planohi.api.service;

import com.planohi.api.entity.Event;
import com.planohi.api.entity.Invitee;
import com.planohi.api.repository.EventRepository;
import com.planohi.api.repository.InviteeRepository;
import com.planohi.api.service.impl.InviteeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quartz.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.Instant;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SendAllInvitesSchedulingTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private InviteeRepository inviteeRepository;

    @Mock
    private WorkspaceSecurityService workspaceSecurityService;

    @Mock
    private EmailPublisher emailPublisher;

    @Mock
    private Scheduler scheduler;

    @InjectMocks
    private InviteeServiceImpl inviteeService;

    private UUID userId;
    private UUID eventId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        eventId = UUID.randomUUID();
        ReflectionTestUtils.setField(inviteeService, "frontendUrl", "http://localhost:3000");
    }

    @Test
    void sendBulkInvites_immediate() throws Exception {
        Event event = Event.builder().id(eventId).title("Immediate Event").build();
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        JobKey jobKey = JobKey.jobKey(eventId.toString(), "invite-jobs");
        when(scheduler.checkExists(jobKey)).thenReturn(false);

        Invitee pending = Invitee.builder()
                .id(UUID.randomUUID())
                .name("Alice")
                .email("alice@example.com")
                .status("PENDING")
                .token("alice-token")
                .allowedGuests(2)
                .build();
        when(inviteeRepository.findByEventIdAndStatus(eventId, "PENDING")).thenReturn(List.of(pending));

        inviteeService.sendBulkInvites(userId, eventId, null);

        verify(workspaceSecurityService, times(2)).checkWriteAccess(userId, eventId);
        verify(emailPublisher, times(1)).publishEmail(any());
        verify(scheduler, never()).scheduleJob(any(), any());
    }

    @Test
    void sendBulkInvites_scheduled() throws Exception {
        Event event = Event.builder().id(eventId).title("Scheduled Event").build();
        when(eventRepository.findById(eventId)).thenReturn(Optional.of(event));

        JobKey jobKey = JobKey.jobKey(eventId.toString(), "invite-jobs");
        when(scheduler.checkExists(jobKey)).thenReturn(false);

        Instant scheduledTime = Instant.now().plusSeconds(600); // 10 minutes in the future

        inviteeService.sendBulkInvites(userId, eventId, scheduledTime);

        verify(workspaceSecurityService, times(1)).checkWriteAccess(userId, eventId);
        verify(emailPublisher, never()).publishEmail(any());

        ArgumentCaptor<JobDetail> jobDetailCaptor = ArgumentCaptor.forClass(JobDetail.class);
        ArgumentCaptor<Trigger> triggerCaptor = ArgumentCaptor.forClass(Trigger.class);

        verify(scheduler).scheduleJob(jobDetailCaptor.capture(), triggerCaptor.capture());

        JobDetail jobDetail = jobDetailCaptor.getValue();
        assertEquals(eventId.toString(), jobDetail.getKey().getName());
        assertEquals("invite-jobs", jobDetail.getKey().getGroup());
        assertEquals(eventId.toString(), jobDetail.getJobDataMap().getString("eventId"));
        assertEquals(userId.toString(), jobDetail.getJobDataMap().getString("userId"));

        Trigger trigger = triggerCaptor.getValue();
        assertEquals(eventId.toString(), trigger.getKey().getName());
        assertEquals("invite-triggers", trigger.getKey().getGroup());
        assertEquals(Date.from(scheduledTime), trigger.getStartTime());
    }

    @Test
    void cancelScheduledInvites_success() throws Exception {
        JobKey jobKey = JobKey.jobKey(eventId.toString(), "invite-jobs");
        when(scheduler.checkExists(jobKey)).thenReturn(true);

        inviteeService.cancelScheduledInvites(userId, eventId);

        verify(workspaceSecurityService).checkWriteAccess(userId, eventId);
        verify(scheduler).deleteJob(jobKey);
    }

    @Test
    void getScheduledInvitesTime_exists() throws Exception {
        JobKey jobKey = JobKey.jobKey(eventId.toString(), "invite-jobs");
        when(scheduler.checkExists(jobKey)).thenReturn(true);

        Trigger trigger = mock(Trigger.class);
        Instant now = Instant.now().plusSeconds(300);
        when(trigger.getNextFireTime()).thenReturn(Date.from(now));
        doReturn(Collections.singletonList(trigger)).when(scheduler).getTriggersOfJob(jobKey);

        Instant fireTime = inviteeService.getScheduledInvitesTime(userId, eventId);

        verify(workspaceSecurityService).getCuratorRole(userId, eventId);
        assertNotNull(fireTime);
        assertEquals(now.getEpochSecond(), fireTime.getEpochSecond());
    }
}
