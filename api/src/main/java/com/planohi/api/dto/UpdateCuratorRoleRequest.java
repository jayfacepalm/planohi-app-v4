package com.planohi.api.dto;

import com.planohi.api.enums.EventCuratorRole;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateCuratorRoleRequest {
    @NotNull(message = "Role is required")
    private EventCuratorRole role;
}
