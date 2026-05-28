package com.planohi.api.service.cached;

import com.planohi.api.dto.CreateEventRequest;
import com.planohi.api.dto.UpdateEventRequest;
import com.planohi.api.dto.EventDto;
import com.planohi.api.service.EventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventCachedService {

    private final EventService eventService;

    @Cacheable(value = "events_list", key = "#userId.toString() + ':' + (#search != null ? #search : '') + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<EventDto> getEvents(UUID userId, String search, Pageable pageable) {
        log.info("Cache miss: fetching events list for user: {}, search: {}", userId, search);
        return eventService.getEvents(userId, search, pageable);
    }

    @Cacheable(value = "events_detail", key = "#userId.toString() + ':' + #eventId.toString()")
    public EventDto getEventDetails(UUID userId, UUID eventId) {
        log.info("Cache miss: fetching event details for event: {}", eventId);
        return eventService.getEventDetails(userId, eventId);
    }

    @CacheEvict(value = "events_list", allEntries = true)
    public EventDto createEvent(UUID userId, CreateEventRequest request, MultipartFile bannerFile) {
        log.info("Evicting events_list cache due to new event creation");
        return eventService.createEvent(userId, request, bannerFile);
    }

    @Caching(evict = {
        @CacheEvict(value = "events_detail", key = "#userId.toString() + ':' + #eventId.toString()"),
        @CacheEvict(value = "events_list", allEntries = true),
        @CacheEvict(value = "public_rsvp", allEntries = true)
    })
    public EventDto updateEvent(UUID userId, UUID eventId, UpdateEventRequest request, MultipartFile bannerFile) {
        log.info("Evicting events_detail, events_list, and public_rsvp caches due to event update: {}", eventId);
        return eventService.updateEvent(userId, eventId, request, bannerFile);
    }

    @Caching(evict = {
        @CacheEvict(value = "events_detail", key = "#userId.toString() + ':' + #eventId.toString()"),
        @CacheEvict(value = "events_list", allEntries = true),
        @CacheEvict(value = "event_budget_summary", key = "#userId.toString() + ':' + #eventId.toString()"),
        @CacheEvict(value = "event_components", key = "#userId.toString() + ':' + #eventId.toString()"),
        @CacheEvict(value = "event_invitees", allEntries = true),
        @CacheEvict(value = "event_metrics", key = "#eventId"),
        @CacheEvict(value = "public_rsvp", allEntries = true)
    })
    public void deleteEvent(UUID userId, UUID eventId) {
        log.info("Evicting all related caches due to event deletion: {}", eventId);
        eventService.deleteEvent(userId, eventId);
    }

    public byte[] getEventBanner(UUID userId, UUID eventId) {
        // We do not cache the binary banner bytes to avoid bloating Redis
        return eventService.getEventBanner(userId, eventId);
    }
}
