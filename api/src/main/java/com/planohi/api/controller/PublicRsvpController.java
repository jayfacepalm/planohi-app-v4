package com.planohi.api.controller;

import com.planohi.api.service.EventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/public/rsvp")
@RequiredArgsConstructor
public class PublicRsvpController {

    private final EventService eventService;

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
