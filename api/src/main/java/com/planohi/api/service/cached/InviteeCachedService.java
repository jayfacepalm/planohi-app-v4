package com.planohi.api.service.cached;

import com.planohi.api.dto.CreateInviteeRequest;
import com.planohi.api.dto.UpdateInviteeRequest;
import com.planohi.api.dto.InviteeDto;
import com.planohi.api.dto.InviteeMetricsDto;
import com.planohi.api.dto.PublicRsvpDetailsDto;
import com.planohi.api.dto.SubmitRsvpRequest;
import com.planohi.api.service.InviteeService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InviteeCachedService implements InviteeService {

    private final InviteeService inviteeService;

    @Override
    @Caching(evict = {
        @CacheEvict(value = "event_invitees", allEntries = true),
        @CacheEvict(value = "event_metrics", key = "#eventId")
    })
    public void addInvitees(UUID userId, UUID eventId, List<CreateInviteeRequest> requests) {
        inviteeService.addInvitees(userId, eventId, requests);
    }

    @Override
    @Cacheable(value = "event_invitees", key = "#userId.toString() + ':' + #eventId.toString() + ':' + (#search != null ? #search : '') + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<InviteeDto> getInvitees(UUID userId, UUID eventId, String search, Pageable pageable) {
        return inviteeService.getInvitees(userId, eventId, search, pageable);
    }

    @Override
    @Cacheable(value = "event_metrics", key = "#eventId")
    public InviteeMetricsDto getMetrics(UUID userId, UUID eventId) {
        return inviteeService.getMetrics(userId, eventId);
    }

    @Override
    @Cacheable(value = "public_rsvp", key = "#token")
    public PublicRsvpDetailsDto getPublicRsvpDetails(String token) {
        return inviteeService.getPublicRsvpDetails(token);
    }

    @Override
    @Caching(evict = {
        @CacheEvict(value = "public_rsvp", key = "#token"),
        @CacheEvict(value = "event_invitees", allEntries = true),
        @CacheEvict(value = "event_metrics", key = "#result")
    })
    public UUID submitRsvpResponse(String token, SubmitRsvpRequest request) {
        return inviteeService.submitRsvpResponse(token, request);
    }

    @Override
    @Caching(evict = {
        @CacheEvict(value = "public_rsvp", key = "#result.token"),
        @CacheEvict(value = "event_invitees", allEntries = true),
        @CacheEvict(value = "event_metrics", key = "#eventId")
    })
    public InviteeDto updateInvitee(UUID userId, UUID eventId, UUID inviteeId, UpdateInviteeRequest request) {
        return inviteeService.updateInvitee(userId, eventId, inviteeId, request);
    }

    @Override
    @Caching(evict = {
        @CacheEvict(value = "public_rsvp", key = "#result.token"),
        @CacheEvict(value = "event_invitees", allEntries = true),
        @CacheEvict(value = "event_metrics", key = "#eventId")
    })
    public InviteeDto deleteInvitee(UUID userId, UUID eventId, UUID inviteeId) {
        return inviteeService.deleteInvitee(userId, eventId, inviteeId);
    }

    @Override
    public void sendRsvpInvite(UUID userId, UUID eventId, UUID inviteeId) {
        inviteeService.sendRsvpInvite(userId, eventId, inviteeId);
    }
}
