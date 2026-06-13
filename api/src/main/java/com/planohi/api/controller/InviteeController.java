package com.planohi.api.controller;

import com.planohi.api.config.UserPrincipal;
import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.CreateInviteeRequest;
import com.planohi.api.dto.UpdateInviteeRequest;
import com.planohi.api.dto.InviteeDto;
import com.planohi.api.dto.InviteeMetricsDto;
import com.planohi.api.dto.SendBulkInvitesRequest;
import com.planohi.api.dto.BulkInvitesScheduleResponse;
import com.planohi.api.service.InviteeService;
import com.planohi.api.service.WorkspaceSecurityService;
import com.planohi.api.enums.EventCuratorRole;
import jakarta.validation.Valid;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Validated
public class InviteeController {

    private final InviteeService inviteeCachedService;
    private final WorkspaceSecurityService workspaceSecurityService;

    @PostMapping("/{eventId}/invitees")
    public ResponseEntity<ApiResponse<Void>> addInvitees(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable UUID eventId,
            @RequestBody @Valid List<CreateInviteeRequest> requests
    ) {
        log.info("REST request to add {} invitees to event {}", requests.size(), eventId);
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.ORGANIZER);
        inviteeCachedService.addInvitees(userPrincipal.getId(), eventId, requests);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Invitees successfully added", null));
    }

    @GetMapping("/{eventId}/invitees")
    public ResponseEntity<ApiResponse<Page<InviteeDto>>> getInvitees(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable UUID eventId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        log.info("REST request to list invitees for event {}, search='{}', page={}, size={}", eventId, search, page, size);
        Page<InviteeDto> invitees = inviteeCachedService.getInvitees(
                userPrincipal.getId(),
                eventId,
                search,
                PageRequest.of(page, size)
        );
        return ResponseEntity.ok(ApiResponse.success("Invitees listed successfully", invitees));
    }

    @GetMapping("/{eventId}/metrics")
    public ResponseEntity<ApiResponse<InviteeMetricsDto>> getMetrics(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable UUID eventId
    ) {
        log.info("REST request to get invitee metrics for event {}", eventId);
        InviteeMetricsDto metrics = inviteeCachedService.getMetrics(userPrincipal.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.success("Invitee metrics fetched successfully", metrics));
    }

    @PutMapping("/{eventId}/invitees/{inviteeId}")
    public ResponseEntity<ApiResponse<InviteeDto>> updateInvitee(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable UUID eventId,
            @PathVariable UUID inviteeId,
            @RequestBody @Valid UpdateInviteeRequest request
    ) {
        log.info("REST request to update invitee {} for event {}", inviteeId, eventId);
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.ORGANIZER);
        InviteeDto updated = inviteeCachedService.updateInvitee(userPrincipal.getId(), eventId, inviteeId, request);
        return ResponseEntity.ok(ApiResponse.success("Guest updated successfully", updated));
    }

    @DeleteMapping("/{eventId}/invitees/{inviteeId}")
    public ResponseEntity<ApiResponse<Void>> deleteInvitee(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable UUID eventId,
            @PathVariable UUID inviteeId
    ) {
        log.info("REST request to delete invitee {} for event {}", inviteeId, eventId);
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.ORGANIZER);
        inviteeCachedService.deleteInvitee(userPrincipal.getId(), eventId, inviteeId);
        return ResponseEntity.ok(ApiResponse.success("Guest removed successfully", null));
    }

    @PostMapping("/{eventId}/invitees/{inviteeId}/send-invite")
    public ResponseEntity<ApiResponse<Void>> sendRsvpInvite(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable UUID eventId,
            @PathVariable UUID inviteeId
    ) {
        log.info("REST request to send RSVP invite for invitee {} in event {}", inviteeId, eventId);
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.ORGANIZER);
        inviteeCachedService.sendRsvpInvite(userPrincipal.getId(), eventId, inviteeId);
        return ResponseEntity.ok(ApiResponse.success("Invitation sent successfully", null));
    }

    @PostMapping("/{eventId}/invitees/send-all")
    public ResponseEntity<ApiResponse<Void>> sendBulkInvites(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable UUID eventId,
            @RequestBody @Valid SendBulkInvitesRequest request
    ) {
        log.info("REST request to send/schedule bulk invites for event {}, scheduledTime={}", eventId, request.getScheduledTime());
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.ORGANIZER);
        if (request.getScheduledTime() != null && request.getScheduledTime().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Schedule time must be in the future");
        }
        inviteeCachedService.sendBulkInvites(userPrincipal.getId(), eventId, request.getScheduledTime());
        return ResponseEntity.ok(ApiResponse.success(
                request.getScheduledTime() == null ? "Bulk invitations sent successfully" : "Bulk invitations scheduled successfully", 
                null
        ));
    }

    @DeleteMapping("/{eventId}/invitees/send-all/schedule")
    public ResponseEntity<ApiResponse<Void>> cancelScheduledInvites(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable UUID eventId
    ) {
        log.info("REST request to cancel scheduled bulk invites for event {}", eventId);
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.ORGANIZER);
        inviteeCachedService.cancelScheduledInvites(userPrincipal.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.success("Scheduled bulk invitations cancelled successfully", null));
    }

    @GetMapping("/{eventId}/invitees/send-all/schedule")
    public ResponseEntity<ApiResponse<BulkInvitesScheduleResponse>> getScheduledInvitesTime(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable UUID eventId
    ) {
        log.info("REST request to get scheduled bulk invites time for event {}", eventId);
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.ORGANIZER);
        Instant scheduledTime = inviteeCachedService.getScheduledInvitesTime(userPrincipal.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.success(
                "Scheduled bulk invites time fetched successfully",
                BulkInvitesScheduleResponse.builder().scheduledTime(scheduledTime).build()
        ));
    }
}
