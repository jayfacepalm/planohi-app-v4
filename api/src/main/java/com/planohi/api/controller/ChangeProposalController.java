package com.planohi.api.controller;

import com.planohi.api.config.UserPrincipal;
import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.ChangeProposalResponseDto;
import com.planohi.api.dto.ReviewProposalRequest;
import com.planohi.api.service.ChangeProposalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ChangeProposalController {

    private final ChangeProposalService changeProposalService;

    @GetMapping("/api/events/{eventId}/proposals")
    public ResponseEntity<ApiResponse<List<ChangeProposalResponseDto>>> getPendingProposals(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("eventId") UUID eventId) {

        log.info("Request received to view pending proposals for event {} by user {}", eventId, userPrincipal.getId());
        List<ChangeProposalResponseDto> list = changeProposalService.getPendingProposals(userPrincipal.getId(), eventId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/api/proposals/{proposalId}/review")
    public ResponseEntity<ApiResponse<ChangeProposalResponseDto>> reviewProposal(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("proposalId") UUID proposalId,
            @Valid @RequestBody ReviewProposalRequest request) {

        log.info("Request received to review proposal {} with action {} by user {}", 
                proposalId, request.getAction(), userPrincipal.getId());
        ChangeProposalResponseDto reviewed = changeProposalService.reviewProposal(userPrincipal.getId(), proposalId, request);
        return ResponseEntity.ok(ApiResponse.success("Proposal reviewed successfully", reviewed));
    }
}
