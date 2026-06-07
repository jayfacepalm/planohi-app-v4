package com.planohi.api.controller;

import com.planohi.api.config.UserPrincipal;
import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.CreateComponentRequest;
import com.planohi.api.dto.EventComponentDto;
import com.planohi.api.dto.EventComponentsResponse;
import com.planohi.api.dto.UpdateComponentRequest;
import com.planohi.api.service.cached.EventComponentCachedService;
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
import org.springframework.web.bind.annotation.RequestHeader;
import com.planohi.api.service.WorkspaceSecurityService;
import com.planohi.api.enums.EventCuratorRole;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/events/{eventId}/components")
@RequiredArgsConstructor
public class EventComponentController {

    private final EventComponentCachedService eventComponentService;
    private final WorkspaceSecurityService workspaceSecurityService;

    @PostMapping
    public ResponseEntity<ApiResponse<EventComponentDto>> createComponent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable("eventId") UUID eventId,
            @Valid @RequestBody CreateComponentRequest request) {

        log.info("Request received to create component '{}' for event {} by user {}", request.getName(), eventId,
                userPrincipal.getId());
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.COLLABORATOR);
        EventComponentDto created = eventComponentService.createComponent(userPrincipal.getId(), eventId, request);
        return ResponseEntity.status(201).body(ApiResponse.success("Component created successfully", created));
    }

    @PutMapping("/{componentId}")
    public ResponseEntity<ApiResponse<EventComponentDto>> updateComponent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable("eventId") UUID eventId,
            @PathVariable("componentId") UUID componentId,
            @Valid @RequestBody UpdateComponentRequest request) {

        log.info("Request received to update component {} from event {} by user {}", componentId, eventId,
                userPrincipal.getId());
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.COLLABORATOR);
        EventComponentDto updated = eventComponentService.updateComponent(userPrincipal.getId(), eventId, componentId, request);
        return ResponseEntity.ok(ApiResponse.success("Component updated successfully", updated));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<EventComponentsResponse>> getComponents(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId) {

        log.info("Request received to get components for event {} by user {}", eventId, userPrincipal.getId());
        EventComponentsResponse response = eventComponentService.getComponents(userPrincipal.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{componentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComponent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable("eventId") UUID eventId,
            @PathVariable("componentId") UUID componentId) {

        log.info("Request received to delete component {} from event {} by user {}", componentId, eventId,
                userPrincipal.getId());
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.COLLABORATOR);
        eventComponentService.deleteComponent(userPrincipal.getId(), eventId, componentId);
        return ResponseEntity.ok(ApiResponse.success("Component deleted successfully", null));
    }
}
