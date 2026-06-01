package com.planohi.api.service;

import com.planohi.api.enums.EventCuratorRole;
import java.util.UUID;

public interface WorkspaceSecurityService {
    void checkReadAccess(UUID userId, UUID eventId);
    void checkWriteAccess(UUID userId, UUID eventId);
    boolean hasReadAccess(UUID userId, UUID eventId);
    boolean hasWriteAccess(UUID userId, UUID eventId);
    EventCuratorRole getCuratorRole(UUID userId, UUID eventId);
}
