package com.planohi.api.service.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.planohi.api.config.JwtService;
import com.planohi.api.dto.LoginRequest;
import com.planohi.api.dto.RegisterOtpRequest;
import com.planohi.api.dto.RegisterRequest;
import com.planohi.api.dto.UserDto;
import com.planohi.api.entity.UserAccount;
import com.planohi.api.enums.AuthProvider;
import com.planohi.api.enums.UserRole;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.exception.UserAlreadyExistsException;
import com.planohi.api.repository.UserAccountRepository;
import com.planohi.api.service.AuthService;
import com.planohi.api.service.ActivityLogPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    @Value("${google.client-id}")
    private String googleClientId;

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ActivityLogPublisher activityLogPublisher;

    @Override
    @Transactional(readOnly = true)
    public void validateBeforeOtp(RegisterOtpRequest request) {
        log.info("Initiating registration request check for email: {}", request.getEmail());
        if (userAccountRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email is already registered");
        }
    }

    @Override
    @Transactional
    public UserDto registerUser(RegisterRequest request) {
        log.info("Completing registration for user email: {}", request.getEmail());
        if (userAccountRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email is already registered");
        }

        UserAccount userAccount = UserAccount.builder()
                .email(request.getEmail())
                .alias(request.getAlias())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .provider(AuthProvider.SELF_REGISTER)
                .build();

        UserAccount saved = userAccountRepository.save(userAccount);
        log.info("Successfully registered user: {} with ID: {}", saved.getEmail(), saved.getId());

        UserDto userDto = UserDto.builder()
                .id(saved.getId())
                .email(saved.getEmail())
                .alias(saved.getAlias())
                .role(saved.getRole())
                .provider(saved.getProvider())
                .build();

        activityLogPublisher.publish(userDto.getId(), userDto.getAlias(), "USER_REGISTER", "USER", userDto.getId(), null, "SUCCESS", Map.of("email", userDto.getEmail()));

        return userDto;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto login(LoginRequest request) {
        log.info("Verifying login request for email: {}", request.getEmail());
        UserAccount account = userAccountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new EntityNotFoundException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        log.info("User logged in successfully: {}", account.getEmail());
        UserDto userDto = UserDto.builder()
                .id(account.getId())
                .email(account.getEmail())
                .alias(account.getAlias())
                .role(account.getRole())
                .provider(account.getProvider())
                .build();

        activityLogPublisher.publish(userDto.getId(), userDto.getAlias(), "USER_LOGIN", "USER", userDto.getId(), null, "SUCCESS", Map.of("email", userDto.getEmail()));

        return userDto;
    }

    @Override
    public String generateToken(UserDto userDto) {
        return jwtService.generateToken(userDto.getId(), userDto.getEmail(), userDto.getAlias(), userDto.getRole() != null ? userDto.getRole().name() : "NORMAL");
    }

    @Override
    @Transactional
    public UserDto authenticateGoogleUser(String credentialToken) {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                new GsonFactory())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        try {
            GoogleIdToken idToken = verifier.verify(credentialToken);
            if (idToken == null) {
                throw new IllegalArgumentException("Invalid Google credential token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");

            UserAccount account = userAccountRepository.findByEmail(email)
                    .orElseGet(() -> {
                        log.info("Auto-registering new Google OAuth user: {}", email);
                        String randomPassword = UUID.randomUUID().toString() + UUID.randomUUID().toString();
                        UserAccount newAccount = UserAccount.builder()
                                .email(email)
                                .alias(name != null ? name : email.split("@")[0])
                                .passwordHash(passwordEncoder.encode(randomPassword))
                                .role(UserRole.NORMAL)
                                .provider(AuthProvider.GOOGLE)
                                .build();
                        UserAccount savedAccount = userAccountRepository.save(newAccount);
                        
                        activityLogPublisher.publish(
                                savedAccount.getId(), 
                                savedAccount.getAlias(), 
                                "USER_REGISTER", 
                                "USER", 
                                savedAccount.getId(), 
                                null, 
                                "SUCCESS", 
                                Map.of("email", savedAccount.getEmail())
                        );
                        return savedAccount;
                    });

            UserDto userDto = UserDto.builder()
                    .id(account.getId())
                    .email(account.getEmail())
                    .alias(account.getAlias())
                    .role(account.getRole())
                    .provider(account.getProvider())
                    .build();

            activityLogPublisher.publish(
                    userDto.getId(), 
                    userDto.getAlias(), 
                    "USER_LOGIN", 
                    "USER", 
                    userDto.getId(), 
                    null, 
                    "SUCCESS", 
                    Map.of("email", userDto.getEmail())
            );

            return userDto;
        } catch (Exception e) {
            log.error("Google token verification failed", e);
            throw new IllegalArgumentException("Failed to verify Google identity: " + e.getMessage());
        }
    }
}

