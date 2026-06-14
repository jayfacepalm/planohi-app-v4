package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityLogEvent {
    private UUID userId;
    private String userAlias;
    private String action;
    private String entityType;
    private UUID entityId;
    private UUID eventId;
    private String status;
    private Map<String, Object> details;
    private Instant timestamp;
}
