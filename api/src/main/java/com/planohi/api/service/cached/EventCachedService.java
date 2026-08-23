package com.planohi.api.service.cached;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.planohi.api.config.JwtService;
import com.planohi.api.dto.CreateEventRequest;
import com.planohi.api.dto.EventDto;
import com.planohi.api.dto.EventShareSummaryDto;
import com.planohi.api.dto.UpdateEventRequest;
import com.planohi.api.enums.EventCuratorRole;
import com.planohi.api.service.EventService;
import com.planohi.api.service.WorkspaceSecurityService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventCachedService {

    private final EventService eventService;
    private final EventCacheInvalidationService eventCacheInvalidationService;
    private final WorkspaceSecurityService workspaceSecurityService;
    private final JwtService jwtService;

    @Lazy
    @Autowired
    private EventCachedService self;

    @Cacheable(value = "events_list", key = "#userId.toString() + ':' + (#search != null ? #search : '') + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<EventDto> getEvents(UUID userId, String search, Pageable pageable) {
        log.info("Cache miss: fetching events list for user: {}, search: {}", userId, search);
        return eventService.getEvents(userId, search, pageable);
    }

    public EventDto getEventDetails(UUID userId, UUID eventId) {
        workspaceSecurityService.checkReadAccess(userId, eventId);
        EventDto dto = self.getEventDetailsCache(eventId);

        // Dynamically inject userRole after retrieving from global cache
        EventCuratorRole role = EventCuratorRole.VIEWER;
        if (dto.getUserId().equals(userId)) {
            role = EventCuratorRole.OWNER;
        } else {
            try {
                role = workspaceSecurityService.getCuratorRole(userId, eventId);
            } catch (Exception e) {
                // ignore
            }
        }
        String signedRoleToken = jwtService.generateRoleToken(userId, eventId, role);
        dto.setUserRole(signedRoleToken);
        return dto;
    }

    @Cacheable(value = "events_detail", key = "#eventId.toString()")
    public EventDto getEventDetailsCache(UUID eventId) {
        log.info("Cache miss: fetching event details for event: {}", eventId);
        return eventService.getEventDetailsInternal(eventId);
    }

    public EventShareSummaryDto getShareSummary(UUID userId, UUID eventId) {
        return eventService.getShareSummary(userId, eventId);
    }

    @CacheEvict(value = "events_list", allEntries = true)
    public EventDto createEvent(UUID userId, CreateEventRequest request, MultipartFile bannerFile) {
        log.info("Evicting events_list cache due to new event creation");
        return eventService.createEvent(userId, request, bannerFile);
    }

    @CacheEvict(value = { "events_list", "public_rsvp" }, allEntries = true)
    public EventDto updateEvent(UUID userId, UUID eventId, UpdateEventRequest request, MultipartFile bannerFile) {
        log.info("Evicting wildcard event caches due to event update: {}", eventId);
        EventDto dto = eventService.updateEvent(userId, eventId, request, bannerFile);
        eventCacheInvalidationService.evictEventCaches(eventId);
        return dto;
    }

    @CacheEvict(value = { "events_list", "event_invitees", "public_rsvp" }, allEntries = true)
    public void deleteEvent(UUID userId, UUID eventId) {
        log.info("Evicting wildcard event caches due to event deletion: {}", eventId);
        eventService.deleteEvent(userId, eventId);
        eventCacheInvalidationService.evictEventCaches(eventId);
    }

    public byte[] getEventBanner(UUID userId, UUID eventId) {
        // We do not cache the binary banner bytes to avoid bloating Redis
        return eventService.getEventBanner(userId, eventId);
    }
}
