package com.planohi.activityLogs;

import com.planohi.activityLogs.dto.ActivityLogEvent;
import com.planohi.activityLogs.entity.ActivityLog;
import com.planohi.activityLogs.listener.ActivityLogConsumer;
import com.planohi.activityLogs.repository.ActivityLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.amqp.core.Message;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ActivityLogConsumerTest {

    @Mock
    private ActivityLogRepository activityLogRepository;

    @InjectMocks
    private ActivityLogConsumer activityLogConsumer;

    @Mock
    private Message rawMessage;

    @BeforeEach
    void setUp() {
        MDC.clear();
    }

    @Test
    void consume_validEvent_savesToDatabase() {
        MDC.put("correlationId", "abc123xyz7890123");
        UUID userId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();
        Instant now = Instant.now();

        ActivityLogEvent event = ActivityLogEvent.builder()
                .userId(userId)
                .userAlias("Tester")
                .action("EVENT_CREATE")
                .entityType("EVENT")
                .entityId(entityId)
                .eventId(eventId)
                .status("SUCCESS")
                .details(Map.of("hello", "world"))
                .timestamp(now)
                .build();

        activityLogConsumer.consume(event, rawMessage);

        ArgumentCaptor<ActivityLog> captor = ArgumentCaptor.forClass(ActivityLog.class);
        verify(activityLogRepository).save(captor.capture());

        ActivityLog saved = captor.getValue();
        assertEquals("abc123xyz7890123", saved.getCorrelationId());
        assertEquals(userId, saved.getUserId());
        assertEquals("Tester", saved.getUserAlias());
        assertEquals("EVENT_CREATE", saved.getAction());
        assertEquals("EVENT", saved.getEntityType());
        assertEquals(entityId, saved.getEntityId());
        assertEquals(eventId, saved.getEventId());
        assertEquals("SUCCESS", saved.getStatus());
        assertEquals(Map.of("hello", "world"), saved.getDetails());
        assertEquals(now, saved.getTimestamp());
    }
}
