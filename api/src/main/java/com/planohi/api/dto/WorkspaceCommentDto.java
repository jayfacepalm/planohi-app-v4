package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceCommentDto {
    private UUID id;
    private UUID eventId;
    private String targetType;
    private UUID targetId;
    private UUID userId;
    private String authorAlias;
    private String content;
    private Instant createdAt;
}
