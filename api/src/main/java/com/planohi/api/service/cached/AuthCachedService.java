package com.planohi.api.service.cached;

import java.security.SecureRandom;

import org.springframework.stereotype.Service;

import com.planohi.api.dto.EmailMessageDto;
import com.planohi.api.dto.LoginRequest;
import com.planohi.api.dto.RegisterOtpRequest;
import com.planohi.api.dto.RegisterRequest;
import com.planohi.api.dto.UserDto;
import com.planohi.api.exception.InvalidOtpException;
import com.planohi.api.service.AuthService;
import com.planohi.api.service.EmailPublisher;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthCachedService {

    private final AuthService authService;
    private final OtpCacheService otpCacheService;
    private final EmailPublisher emailPublisher;
    private final SecureRandom secureRandom = new SecureRandom();

    public void requestRegistrationOtp(RegisterOtpRequest request) {
        authService.validateBeforeOtp(request);

        // Generate 6-digit OTP
        String otp = String.format("%06d", secureRandom.nextInt(900000) + 100000);

        // Store OTP in cache using annotation-driven service
        otpCacheService.putOtp(request.getEmail(), otp);
        log.info("OTP generated and cached for email: {} [OTP code = {}]", request.getEmail(), otp);

        // Publish registration OTP email notification request
        EmailMessageDto emailMessageDto = EmailMessageDto.builder()
                .templateId("REGISTRATION_OTP")
                .recipientTos(List.of(request.getEmail()))
                .metadata(Map.of("otpCode", otp))
                .userId("SYSTEM")
                .build();
        emailPublisher.publishEmail(emailMessageDto);
    }

    public UserDto completeRegistration(RegisterRequest request) {
        String cachedOtp = otpCacheService.getOtp(request.getEmail());
        if (cachedOtp == null) {
            throw new InvalidOtpException("OTP code has expired or is invalid");
        }

        if (!cachedOtp.equals(request.getOtp())) {
            throw new InvalidOtpException("Invalid OTP code");
        }

        // Evict key from cache on success
        otpCacheService.evictOtp(request.getEmail());
        log.info("OTP evicted from cache for email: {}", request.getEmail());

        return authService.registerUser(request);
    }

    public UserDto login(LoginRequest request) {
        return authService.login(request);
    }

    public String generateToken(UserDto userDto) {
        return authService.generateToken(userDto);
    }

    public UserDto authenticateGoogleUser(String credentialToken) {
        return authService.authenticateGoogleUser(credentialToken);
    }
}
