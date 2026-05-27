package com.planohi.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class TimelineItemDto {
    private UUID id;
    private UUID eventId;
    private String title;
    private Instant dueAt;

    @JsonProperty("isDone")
    private boolean isDone;
}
