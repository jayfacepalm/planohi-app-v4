package com.planohi.api.controller;

import com.planohi.api.config.UserPrincipal;
import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.BudgetSummaryResponse;
import com.planohi.api.dto.CreateEventRequest;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventCachedService eventService;
    private final EventComponentCachedService eventComponentService;

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
}
