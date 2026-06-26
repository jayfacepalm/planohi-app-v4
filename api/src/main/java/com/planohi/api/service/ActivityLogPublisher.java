package com.planohi.api.service;

import com.planohi.api.dto.ActivityLogEvent;
import com.planohi.api.config.UserPrincipal;
import com.planohi.api.event.ActivityLogPublishEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityLogPublisher {

    private final ApplicationEventPublisher eventPublisher;

    public void publish(UUID userId, String userAlias, String action, String entityType, UUID entityId, UUID eventId, String status, Map<String, Object> details) {
        UUID finalUserId = userId;
        String finalUserAlias = userAlias;

        if (finalUserId == null) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
                finalUserId = principal.getId();
                finalUserAlias = principal.getAlias();
            }
        }

        ActivityLogEvent event = ActivityLogEvent.builder()
                .userId(finalUserId)
                .userAlias(finalUserAlias)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .eventId(eventId)
                .status(status)
                .details(details)
                .timestamp(Instant.now())
                .build();

        try {
            eventPublisher.publishEvent(new ActivityLogPublishEvent(this, event));
            log.debug("Successfully published activity log event locally: {}", action);
        } catch (Exception e) {
            log.error("Failed to publish activity log event locally for action: {}", action, e);
        }
    }
}
