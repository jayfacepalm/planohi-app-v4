package com.planohi.api.service;

import com.planohi.api.dto.CreateEventRequest;
import com.planohi.api.dto.UpdateEventRequest;
import com.planohi.api.dto.EventDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

import com.planohi.api.dto.EventShareSummaryDto;

public interface EventService {
    EventDto createEvent(UUID userId, CreateEventRequest request, MultipartFile bannerFile);
    Page<EventDto> getEvents(UUID userId, String search, Pageable pageable);
    EventDto getEventDetails(UUID userId, UUID eventId);
    byte[] getEventBanner(UUID userId, UUID eventId);
    byte[] getEventBannerByToken(String token);
    EventDto updateEvent(UUID userId, UUID eventId, UpdateEventRequest request, MultipartFile bannerFile);
    void deleteEvent(UUID userId, UUID eventId);
    EventShareSummaryDto getShareSummary(UUID userId, UUID eventId);
}
