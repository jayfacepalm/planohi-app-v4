package com.planohi.api.controller;

import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.LoginRequest;
import com.planohi.api.dto.RegisterOtpRequest;
import com.planohi.api.dto.RegisterRequest;
import com.planohi.api.dto.UserDto;
import com.planohi.api.service.cached.AuthCachedService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Value;
import java.time.Duration;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthCachedService cachedAuthService;

    @Value("${app.security.cookie-secure:true}")
    private boolean cookieSecure;

    @PostMapping("/register/otp")
    public ResponseEntity<ApiResponse<Void>> requestOtp(@Valid @RequestBody RegisterOtpRequest request) {
        log.info("Received request to generate registration OTP for email: {}", request.getEmail());
        long startTime = System.currentTimeMillis();

        cachedAuthService.requestRegistrationOtp(request);

        long duration = System.currentTimeMillis() - startTime;
        log.info("Successfully generated OTP for email: {} in {}ms", request.getEmail(), duration);

        return ResponseEntity.ok(ApiResponse.success("OTP code sent successfully", null));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDto>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse response) {
        log.info("Received request to complete registration for email: {}", request.getEmail());
        long startTime = System.currentTimeMillis();

        UserDto user = cachedAuthService.completeRegistration(request);
        String token = cachedAuthService.generateToken(user);

        // Inject session cookie
        ResponseCookie sessionCookie = ResponseCookie.from("AUTH_TOKEN", token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(Duration.ofDays(1))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.toString());

        long duration = System.currentTimeMillis() - startTime;
        log.info("Successfully completed registration and logged in for email: {} in {}ms", request.getEmail(),
                duration);

        return ResponseEntity.ok(ApiResponse.success("Registered and logged in successfully", user));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserDto>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        log.info("Received request to login user with email: {}", request.getEmail());
        long startTime = System.currentTimeMillis();

        UserDto user = cachedAuthService.login(request);
        String token = cachedAuthService.generateToken(user);

        // Inject session cookie
        ResponseCookie sessionCookie = ResponseCookie.from("AUTH_TOKEN", token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(Duration.ofDays(1))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.toString());

        long duration = System.currentTimeMillis() - startTime;
        log.info("Successfully authenticated and logged in user: {} in {}ms", request.getEmail(), duration);

        return ResponseEntity.ok(ApiResponse.success("Logged in successfully", user));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
        log.info("Received request to log out current user session");
        long startTime = System.currentTimeMillis();

        // Evict session cookie by setting its maxAge to 0
        ResponseCookie clearCookie = ResponseCookie.from("AUTH_TOKEN", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, clearCookie.toString());

        long duration = System.currentTimeMillis() - startTime;
        log.info("Successfully cleared session cookie in {}ms", duration);

        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }
}
