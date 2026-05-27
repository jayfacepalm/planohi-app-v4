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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
public class TimelineController {

    private final TimelineService timelineService;
    private final TimelineCachedService timelineCachedService;

    @PostMapping("/api/events/{eventId}/timeline")
    public ResponseEntity<ApiResponse<TimelineItemDto>> createTimelineItem(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId,
            @Valid @RequestBody CreateTimelineItemRequest request) {

        log.info("Request received to create timeline item in event {} by user {}", eventId, userPrincipal.getId());
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
            @PathVariable("itemId") UUID itemId,
            @Valid @RequestBody ToggleTimelineItemRequest request) {

        log.info("Request received to toggle timeline item {} to {} by user {}", itemId, request.getIsDone(), userPrincipal.getId());
        TimelineItemDto updated = timelineCachedService.toggleTimelineItem(userPrincipal.getId(), itemId, request.getIsDone());
        return ResponseEntity.ok(ApiResponse.success("Timeline item toggled successfully", updated));
    }
}
