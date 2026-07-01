package com.planohi.api.activitylogs.listener;

import com.planohi.api.event.ActivityLogPublishEvent;
import com.planohi.api.activitylogs.entity.ActivityLog;
import com.planohi.api.activitylogs.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class ActivityLogEventListener {

    private final ActivityLogRepository activityLogRepository;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleActivityLogEvent(ActivityLogPublishEvent springEvent) {
        var event = springEvent.getLogEventData();
        log.info("Processing ActivityLogPublishEvent asynchronously for action: {}", event.getAction());

        String correlationId = org.slf4j.MDC.get("correlationId");
        if (correlationId == null || correlationId.trim().isEmpty()) {
            correlationId = "UNKNOWN";
        }
        if (correlationId.length() > 16) {
            correlationId = correlationId.substring(0, 16);
        }

        try {
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
                    .timestamp(event.getTimestamp() != null ? event.getTimestamp() : Instant.now())
                    .build();

            activityLogRepository.save(activityLog);
            log.info("Successfully persisted activity log asynchronously for action: {}", event.getAction());
        } catch (Exception e) {
            log.error("Failed to handle ActivityLogPublishEvent for action: {}", event.getAction(), e);
        }
    }
}
