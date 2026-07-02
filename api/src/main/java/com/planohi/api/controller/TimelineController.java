package com.planohi.api.controller;

import com.planohi.api.config.UserPrincipal;
import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.CreateTimelineItemRequest;
import com.planohi.api.dto.EventTimelineResponse;
import com.planohi.api.dto.TimelineItemDto;
import com.planohi.api.dto.ToggleTimelineItemRequest;
import com.planohi.api.service.TimelineService;
import com.planohi.api.service.cached.TimelineCachedService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;
import com.planohi.api.dto.UpdateTimelineItemRequest;
import com.planohi.api.repository.TimelineItemRepository;
import com.planohi.api.service.WorkspaceSecurityService;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.exception.EntityNotFoundException;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
public class TimelineController {

    private final TimelineService timelineService;
    private final TimelineCachedService timelineCachedService;
    private final TimelineItemRepository timelineItemRepository;
    private final WorkspaceSecurityService workspaceSecurityService;

    private UUID getEventId(UUID itemId) {
        return timelineItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Timeline item not found"))
                .getEventId();
    }

    @PostMapping("/api/events/{eventId}/timeline")
    public ResponseEntity<ApiResponse<TimelineItemDto>> createTimelineItem(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable("eventId") UUID eventId,
            @Valid @RequestBody CreateTimelineItemRequest request) {

        log.info("Request received to create timeline item in event {} by user {}", eventId, userPrincipal.getId());
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.COLLABORATOR);
        TimelineItemDto created = timelineCachedService.createTimelineItem(userPrincipal.getId(), eventId, request);
        return ResponseEntity.status(201).body(ApiResponse.success("Timeline item created successfully", created));
    }

    @GetMapping("/api/events/{eventId}/timeline")
    public ResponseEntity<ApiResponse<EventTimelineResponse>> getEventTimeline(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId) {

        log.info("Request received to get timeline for event {} by user {}", eventId, userPrincipal.getId());
        EventTimelineResponse response = timelineCachedService.getEventTimeline(userPrincipal.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/api/timeline/{itemId}/toggle")
    public ResponseEntity<ApiResponse<TimelineItemDto>> toggleTimelineItem(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable("itemId") UUID itemId,
            @Valid @RequestBody ToggleTimelineItemRequest request) {

        log.info("Request received to toggle timeline item {} to {} by user {}", itemId, request.getIsDone(), userPrincipal.getId());
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), getEventId(itemId), EventCuratorRole.COLLABORATOR);
        TimelineItemDto updated = timelineCachedService.toggleTimelineItem(userPrincipal.getId(), itemId, request.getIsDone());
        return ResponseEntity.ok(ApiResponse.success("Timeline item toggled successfully", updated));
    }

    @PutMapping("/api/timeline/{itemId}")
    public ResponseEntity<ApiResponse<TimelineItemDto>> updateTimelineItem(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable("itemId") UUID itemId,
            @Valid @RequestBody UpdateTimelineItemRequest request) {

        log.info("Request received to update timeline item {} by user {}", itemId, userPrincipal.getId());
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), getEventId(itemId), EventCuratorRole.COLLABORATOR);
        TimelineItemDto updated = timelineCachedService.updateTimelineItem(userPrincipal.getId(), itemId, request);
        return ResponseEntity.ok(ApiResponse.success("Timeline item updated successfully", updated));
    }

    @DeleteMapping("/api/timeline/{itemId}")
    public ResponseEntity<ApiResponse<Void>> deleteTimelineItem(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable("itemId") UUID itemId) {

        log.info("Request received to delete timeline item {} by user {}", itemId, userPrincipal.getId());
        UUID eventId = getEventId(itemId);
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.COLLABORATOR);
        timelineCachedService.deleteTimelineItem(userPrincipal.getId(), itemId, eventId);
        return ResponseEntity.ok(ApiResponse.success("Timeline item deleted successfully", null));
    }
}
