package com.planohi.api.controller;

import com.planohi.api.config.UserPrincipal;
import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.BudgetSummaryResponse;
import com.planohi.api.dto.CreateEventRequest;
import com.planohi.api.dto.UpdateEventRequest;
import com.planohi.api.dto.EventDto;
import com.planohi.api.service.cached.EventComponentCachedService;
import com.planohi.api.service.cached.EventCachedService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.planohi.api.service.WorkspaceSecurityService;
import com.planohi.api.enums.EventCuratorRole;
import org.springframework.web.bind.annotation.RequestHeader;
import com.planohi.api.service.cached.EventSpendingCachedService;
import com.planohi.api.dto.EventSpendingDto;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventCachedService eventService;
    private final EventComponentCachedService eventComponentService;
    private final EventSpendingCachedService eventSpendingCachedService;
    private final WorkspaceSecurityService workspaceSecurityService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<EventDto>> createEvent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @ModelAttribute CreateEventRequest request,
            @RequestParam(value = "banner", required = false) MultipartFile banner) {

        log.info("Request received to create event: '{}' by user {}", request.getTitle(), userPrincipal.getId());
        EventDto created = eventService.createEvent(userPrincipal.getId(), request, banner);
        return ResponseEntity.status(201).body(ApiResponse.success("Event created successfully", created));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventDto>>> getEvents(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", required = false) String search) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("startDate").ascending());
        Page<EventDto> events = eventService.getEvents(userPrincipal.getId(), search, pageable);
        return ResponseEntity.ok(ApiResponse.success(events));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDto>> getEventDetails(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId) {

        EventDto details = eventService.getEventDetails(userPrincipal.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.success(details));
    }

    @GetMapping("/{eventId}/banner")
    public ResponseEntity<byte[]> getEventBanner(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId) {

        byte[] imageBytes = eventService.getEventBanner(userPrincipal.getId(), eventId);
        if (imageBytes == null || imageBytes.length == 0) {
            return ResponseEntity.notFound().build();
        }

        MediaType mediaType = MediaType.IMAGE_PNG;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CACHE_CONTROL, "max-age=31536000")
                .body(imageBytes);
    }

    @GetMapping("/{eventId}/budget-summary")
    public ResponseEntity<ApiResponse<BudgetSummaryResponse>> getBudgetSummary(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId) {

        log.info("Request received to get budget summary for event {} by user {}", eventId, userPrincipal.getId());
        BudgetSummaryResponse summary = eventComponentService.getBudgetSummary(userPrincipal.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @PutMapping(value = "/{eventId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<EventDto>> updateEvent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable("eventId") UUID eventId,
            @Valid @ModelAttribute UpdateEventRequest request,
            @RequestParam(value = "banner", required = false) MultipartFile banner) {

        log.info("Request received to update event {} by user {}", eventId, userPrincipal.getId());
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.ORGANIZER);
        EventDto updated = eventService.updateEvent(userPrincipal.getId(), eventId, request, banner);
        return ResponseEntity.ok(ApiResponse.success("Event updated successfully", updated));
    }

    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestHeader(value = WorkspaceSecurityService.ROLE_TOKEN_HEADER, required = false) String roleToken,
            @PathVariable("eventId") UUID eventId) {

        log.info("Request received to delete event {} by user {}", eventId, userPrincipal.getId());
        workspaceSecurityService.validateRoleToken(roleToken, userPrincipal.getId(), eventId, EventCuratorRole.OWNER);
        eventService.deleteEvent(userPrincipal.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.success("Event deleted successfully", null));
    }

    @GetMapping("/{eventId}/spendings")
    public ResponseEntity<ApiResponse<Page<EventSpendingDto>>> getChronologicalSpendings(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        log.info("REST request to list chronological spendings for event {}, search='{}', page={}, size={}", eventId, search, page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "spentAt")
                .and(Sort.by(Sort.Direction.DESC, "createdAt")));
        Page<EventSpendingDto> spendings = eventSpendingCachedService.getChronologicalSpendings(
                userPrincipal.getId(),
                eventId,
                search,
                pageable
        );
        return ResponseEntity.ok(ApiResponse.success("Chronological spendings retrieved successfully", spendings));
    }
}
