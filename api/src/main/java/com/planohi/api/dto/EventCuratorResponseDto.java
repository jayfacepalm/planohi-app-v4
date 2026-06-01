package com.planohi.api.dto;

import com.planohi.api.enums.EventCuratorRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventCuratorResponseDto {
    private UUID id;
    private UUID eventId;
    private UUID userId;
    private String email;
    private String alias;
    private EventCuratorRole role;
    private String status;
}
