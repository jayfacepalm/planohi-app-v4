package com.planohi.activityLogs.listener;

import com.planohi.activityLogs.dto.ActivityLogEvent;
import com.planohi.activityLogs.entity.ActivityLog;
import com.planohi.activityLogs.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ActivityLogConsumer {

    private final ActivityLogRepository activityLogRepository;

    @RabbitListener(queues = "activity.log.queue")
    public void consume(ActivityLogEvent event, Message message) {
        log.info("Received activity log event: {}", event.getAction());

        String correlationId = MDC.get("correlationId");
        if (correlationId == null || correlationId.trim().isEmpty()) {
            correlationId = "UNKNOWN";
        }
        if (correlationId.length() > 16) {
            correlationId = correlationId.substring(0, 16);
        }

        ActivityLog activityLog = ActivityLog.builder()
                .correlationId(correlationId)
                .userId(event.getUserId())
                .userAlias(event.getUserAlias())
                .action(event.getAction())
                .entityType(event.getEntityType())
                .entityId(event.getEntityId())
                .eventId(event.getEventId())
                .status(event.getStatus())
                .details(event.getDetails())
                .timestamp(event.getTimestamp() != null ? event.getTimestamp() : java.time.Instant.now())
                .build();

        activityLogRepository.save(activityLog);
        log.info("Successfully persisted activity log for action: {}", event.getAction());
    }
}
