package com.planohi.api.service;

import com.planohi.api.dto.ActivityLogEvent;
import com.planohi.api.event.ActivityLogPublishEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ActivityLogPublisherTest {

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ActivityLogPublisher activityLogPublisher;

    private UUID userId;
    private UUID eventId;
    private UUID entityId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        eventId = UUID.randomUUID();
        entityId = UUID.randomUUID();
    }

    @Test
    void publish_successfulEvent_publishesSpringEvent() {
        Map<String, Object> details = Map.of("key", "value");

        activityLogPublisher.publish(userId, "TestUser", "EVENT_CREATE", "EVENT", entityId, eventId, "SUCCESS", details);

        ArgumentCaptor<ActivityLogPublishEvent> captor = ArgumentCaptor.forClass(ActivityLogPublishEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());

        ActivityLogPublishEvent publishEvent = captor.getValue();
        ActivityLogEvent captured = publishEvent.getLogEventData();
        assertEquals(userId, captured.getUserId());
        assertEquals("TestUser", captured.getUserAlias());
        assertEquals("EVENT_CREATE", captured.getAction());
        assertEquals("EVENT", captured.getEntityType());
        assertEquals(entityId, captured.getEntityId());
        assertEquals(eventId, captured.getEventId());
        assertEquals("SUCCESS", captured.getStatus());
        assertEquals(details, captured.getDetails());
        assertNotNull(captured.getTimestamp());
    }
}
