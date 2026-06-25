package com.planohi.api.controller;

import com.planohi.api.config.UserPrincipal;
import com.planohi.api.config.JwtService;
import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.UserDto;
import com.planohi.api.dto.VoucherDetailsDto;
import com.planohi.api.entity.UserAccount;
import com.planohi.api.repository.UserAccountRepository;
import com.planohi.api.service.VoucherService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;
    private final JwtService jwtService;
    private final UserAccountRepository userAccountRepository;

    @Value("${app.security.cookie-secure:true}")
    private boolean cookieSecure;

    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<String>>> generateVouchers(@RequestBody GenerateVoucherRequest request) {
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        log.info("Admin {} is generating {} vouchers", principal.getEmail(), request.getQuantity());

        if (request.getQuantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero.");
        }

        List<String> codes = voucherService.generateVouchers(principal.getId(), request.getQuantity(), request.getExpiresAt());
        return ResponseEntity.ok(ApiResponse.success("Voucher codes generated successfully.", codes));
    }

    @PostMapping("/activate")
    public ResponseEntity<ApiResponse<UserDto>> activateVoucher(
            @RequestBody ActivateVoucherRequest request,
            HttpServletResponse response
    ) {
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        log.info("User {} is activating voucher: {}", principal.getEmail(), request.getCode());

        voucherService.activateVoucher(principal.getId(), request.getCode());

        // Fetch updated user to reissue token with updated PREMIUM role
        UserAccount user = userAccountRepository.findById(principal.getId())
                .orElseThrow(() -> new com.planohi.api.exception.EntityNotFoundException("User profile not found."));

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getAlias(), user.getRole().name());

        // Refresh AUTH_TOKEN cookie in client browser session
        ResponseCookie sessionCookie = ResponseCookie.from("AUTH_TOKEN", token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(Duration.ofDays(1))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.toString());

        UserDto userDto = UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .alias(user.getAlias())
                .role(user.getRole())
                .build();

        return ResponseEntity.ok(ApiResponse.success("Voucher activated successfully. Your account has been upgraded to Premium tier.", userDto));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<VoucherDetailsDto>>> getAllVouchers() {
        UserPrincipal principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        log.info("Admin {} is retrieving all voucher history", principal.getEmail());

        List<VoucherDetailsDto> vouchers = voucherService.getAllVouchers(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Vouchers retrieved successfully.", vouchers));
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateVoucherRequest {
        private int quantity;
        private Instant expiresAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivateVoucherRequest {
        private String code;
    }
}
