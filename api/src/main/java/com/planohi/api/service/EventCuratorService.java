package com.planohi.api.service;

import com.planohi.api.dto.EventCuratorResponseDto;
import com.planohi.api.dto.EventInvitationResponseDto;
import com.planohi.api.enums.EventCuratorRole;
import java.util.List;
import java.util.UUID;

public interface EventCuratorService {
    EventCuratorResponseDto inviteCurator(UUID requesterId, UUID eventId, String email, EventCuratorRole role);
    List<EventCuratorResponseDto> getCurators(UUID requesterId, UUID eventId);
    EventCuratorResponseDto updateCuratorRole(UUID requesterId, UUID eventId, UUID curatorId, EventCuratorRole role);
    void revokeCuratorAccess(UUID requesterId, UUID eventId, UUID curatorId);
    List<EventInvitationResponseDto> getMyInvitations(UUID userId);
    void respondToInvitation(UUID userId, UUID invitationId, boolean accept);
}
