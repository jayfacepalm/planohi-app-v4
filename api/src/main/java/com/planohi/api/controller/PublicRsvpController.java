package com.planohi.api.controller;

import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.PublicRsvpDetailsDto;
import com.planohi.api.dto.SubmitRsvpRequest;
import com.planohi.api.service.EventService;
import com.planohi.api.service.InviteeService;
import com.planohi.api.service.ActivityLogPublisher;
import com.planohi.api.dto.InviteeDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/public/rsvp")
@RequiredArgsConstructor
public class PublicRsvpController {

    private final InviteeService inviteeCachedService;
    private final EventService eventService;
    private final ActivityLogPublisher activityLogPublisher;

    @GetMapping("/{token}")
    public ResponseEntity<ApiResponse<PublicRsvpDetailsDto>> getPublicRsvpDetails(@PathVariable String token) {
        log.info("Public guest details fetch requested for token: {}", token);
        PublicRsvpDetailsDto details = inviteeCachedService.getPublicRsvpDetails(token);
        return ResponseEntity.ok(ApiResponse.success("RSVP details fetched successfully", details));
    }

    @PostMapping("/{token}")
    public ResponseEntity<ApiResponse<Void>> submitRsvpResponse(
            @PathVariable String token,
            @RequestBody @Valid SubmitRsvpRequest request
    ) {
        log.info("Public guest RSVP submission requested for token: {}, status={}, attendingGuests={}", 
                token, request.getStatus(), request.getAttendingGuests());
        InviteeDto invitee = inviteeCachedService.submitRsvpResponse(token, request);
        
        activityLogPublisher.publish(
                null,
                "Guest: " + invitee.getName(),
                "INVITEE_RSVP_SUBMIT",
                "INVITEE",
                invitee.getId(),
                invitee.getEventId(),
                "SUCCESS",
                Map.of("status", invitee.getStatus(), "attendingGuests", invitee.getAttendingGuests())
        );
        
        return ResponseEntity.ok(ApiResponse.success("RSVP submitted successfully", null));
    }

    @GetMapping("/banner")
    public ResponseEntity<byte[]> getGuestEventBanner(@RequestParam("token") String token) {
        log.info("Public guest banner fetch requested for token: {}", token);
        byte[] imageBytes = eventService.getEventBannerByToken(token);
        if (imageBytes == null || imageBytes.length == 0) {
            return ResponseEntity.notFound().build();
        }

        MediaType mediaType = MediaType.IMAGE_PNG;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CACHE_CONTROL, "max-age=31536000")
                .body(imageBytes);
    }
}
