package com.planohi.api.service.impl;

import com.planohi.api.config.JwtService;
import com.planohi.api.dto.LoginRequest;
import com.planohi.api.dto.RegisterOtpRequest;
import com.planohi.api.dto.RegisterRequest;
import com.planohi.api.dto.UserDto;
import com.planohi.api.entity.UserAccount;
import com.planohi.api.exception.EntityNotFoundException;
import com.planohi.api.exception.UserAlreadyExistsException;
import com.planohi.api.repository.UserAccountRepository;
import com.planohi.api.service.AuthService;
import com.planohi.api.service.ActivityLogPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

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
                .build();

        UserAccount saved = userAccountRepository.save(userAccount);
        log.info("Successfully registered user: {} with ID: {}", saved.getEmail(), saved.getId());

        UserDto userDto = UserDto.builder()
                .id(saved.getId())
                .email(saved.getEmail())
                .alias(saved.getAlias())
                .role(saved.getRole())
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
                .build();

        activityLogPublisher.publish(userDto.getId(), userDto.getAlias(), "USER_LOGIN", "USER", userDto.getId(), null, "SUCCESS", Map.of("email", userDto.getEmail()));

        return userDto;
    }

    @Override
    public String generateToken(UserDto userDto) {
        return jwtService.generateToken(userDto.getId(), userDto.getEmail(), userDto.getAlias(), userDto.getRole() != null ? userDto.getRole().name() : "NORMAL");
    }
}

