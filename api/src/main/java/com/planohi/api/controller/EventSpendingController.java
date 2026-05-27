package com.planohi.api.controller;

import com.planohi.api.config.UserPrincipal;
import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.CreateSpendingRequest;
import com.planohi.api.dto.EventSpendingDto;
import com.planohi.api.service.cached.EventSpendingCachedService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/components/{componentId}/spendings")
@RequiredArgsConstructor
public class EventSpendingController {

    private final EventSpendingCachedService eventSpendingCachedService;

    @PostMapping
    public ResponseEntity<ApiResponse<EventSpendingDto>> createSpending(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable("componentId") UUID componentId,
            @Valid @RequestBody CreateSpendingRequest request) {

        log.info("Request received to log spending of {} on component {} by user {}", request.getAmount(), componentId, userPrincipal.getId());

        EventSpendingDto created = eventSpendingCachedService.createSpending(userPrincipal.getId(), componentId, request);
        return ResponseEntity.status(201).body(ApiResponse.success("Spending recorded successfully", created));
    }
}
