package com.planohi.api.controller;

import com.planohi.api.config.UserPrincipal;
import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.EventCuratorResponseDto;
import com.planohi.api.dto.EventInvitationResponseDto;
import com.planohi.api.dto.InviteCuratorRequest;
import com.planohi.api.dto.UpdateCuratorRoleRequest;
import com.planohi.api.dto.RespondInvitationRequest;
import com.planohi.api.service.EventCuratorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EventCuratorController {

    private final EventCuratorService eventCuratorService;

    @PostMapping("/events/{eventId}/curators")
    public ResponseEntity<ApiResponse<EventCuratorResponseDto>> inviteCurator(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId,
            @Valid @RequestBody InviteCuratorRequest request) {

        log.info("Request to invite curator {} to event {} by user {}", request.getEmail(), eventId, userPrincipal.getId());
        EventCuratorResponseDto response = eventCuratorService.inviteCurator(
                userPrincipal.getId(), eventId, request.getEmail(), request.getRole());
        return ResponseEntity.status(201).body(ApiResponse.success("Curator invited successfully", response));
    }

    @GetMapping("/events/{eventId}/curators")
    public ResponseEntity<ApiResponse<List<EventCuratorResponseDto>>> getCurators(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId) {

        log.debug("Request to get curators for event {} by user {}", eventId, userPrincipal.getId());
        List<EventCuratorResponseDto> response = eventCuratorService.getCurators(userPrincipal.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/events/{eventId}/curators/{curatorId}")
    public ResponseEntity<ApiResponse<EventCuratorResponseDto>> updateCuratorRole(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId,
            @PathVariable("curatorId") UUID curatorId,
            @Valid @RequestBody UpdateCuratorRoleRequest request) {

        log.info("Request to update curator {} role in event {} to {} by user {}", curatorId, eventId, request.getRole(), userPrincipal.getId());
        EventCuratorResponseDto response = eventCuratorService.updateCuratorRole(
                userPrincipal.getId(), eventId, curatorId, request.getRole());
        return ResponseEntity.ok(ApiResponse.success("Curator role updated successfully", response));
    }

    @DeleteMapping("/events/{eventId}/curators/{curatorId}")
    public ResponseEntity<ApiResponse<Void>> revokeCuratorAccess(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId,
            @PathVariable("curatorId") UUID curatorId) {

        log.info("Request to revoke curator {} access in event {} by user {}", curatorId, eventId, userPrincipal.getId());
        eventCuratorService.revokeCuratorAccess(userPrincipal.getId(), eventId, curatorId);
        return ResponseEntity.ok(ApiResponse.success("Curator access revoked successfully", null));
    }

    @GetMapping("/curators/invitations")
    public ResponseEntity<ApiResponse<List<EventInvitationResponseDto>>> getMyInvitations(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        log.debug("Request to get pending invitations for user {}", userPrincipal.getId());
        List<EventInvitationResponseDto> response = eventCuratorService.getMyInvitations(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/curators/invitations/{curatorId}/respond")
    public ResponseEntity<ApiResponse<Void>> respondToInvitation(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("curatorId") UUID invitationId,
            @RequestBody RespondInvitationRequest request) {

        log.info("Request to respond to invitation {} by user {} (accept={})", invitationId, userPrincipal.getId(), request.isAccept());
        eventCuratorService.respondToInvitation(userPrincipal.getId(), invitationId, request.isAccept());
        String msg = request.isAccept() ? "Invitation accepted successfully" : "Invitation declined successfully";
        return ResponseEntity.ok(ApiResponse.success(msg, null));
    }
}
