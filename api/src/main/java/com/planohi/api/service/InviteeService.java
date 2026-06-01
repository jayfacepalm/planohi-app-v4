package com.planohi.api.service;

import com.planohi.api.dto.CreateInviteeRequest;
import com.planohi.api.dto.UpdateInviteeRequest;
import com.planohi.api.dto.InviteeDto;
import com.planohi.api.dto.InviteeMetricsDto;
import com.planohi.api.dto.PublicRsvpDetailsDto;
import com.planohi.api.dto.SubmitRsvpRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;

public interface InviteeService {
    void addInvitees(UUID userId, UUID eventId, List<CreateInviteeRequest> requests);
    Page<InviteeDto> getInvitees(UUID userId, UUID eventId, String search, Pageable pageable);
    InviteeMetricsDto getMetrics(UUID userId, UUID eventId);
    PublicRsvpDetailsDto getPublicRsvpDetails(String token);
    UUID submitRsvpResponse(String token, SubmitRsvpRequest request);
    InviteeDto updateInvitee(UUID userId, UUID eventId, UUID inviteeId, UpdateInviteeRequest request);
    InviteeDto deleteInvitee(UUID userId, UUID eventId, UUID inviteeId);
    void sendRsvpInvite(UUID userId, UUID eventId, UUID inviteeId);
}
