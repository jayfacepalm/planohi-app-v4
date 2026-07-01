package com.planohi.api.service;

import com.planohi.api.dto.LoginRequest;
import com.planohi.api.dto.RegisterOtpRequest;
import com.planohi.api.dto.RegisterRequest;
import com.planohi.api.dto.UserDto;

public interface AuthService {
    void validateBeforeOtp(RegisterOtpRequest request);
    UserDto registerUser(RegisterRequest request);
    UserDto login(LoginRequest request);
    String generateToken(UserDto userDto);
    UserDto authenticateGoogleUser(String credentialToken);
}
