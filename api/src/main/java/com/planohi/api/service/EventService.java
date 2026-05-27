package com.planohi.api.service;

import com.planohi.api.dto.CreateEventRequest;
import com.planohi.api.dto.EventDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

public interface EventService {
    EventDto createEvent(UUID userId, CreateEventRequest request, MultipartFile bannerFile);
    Page<EventDto> getEvents(UUID userId, String search, Pageable pageable);
    EventDto getEventDetails(UUID userId, UUID eventId);
    byte[] getEventBanner(UUID userId, UUID eventId);
    byte[] getEventBannerByToken(String token);
}
