package com.planohi.api.service.cached;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class OtpCacheService {

    @CachePut(value = "otps", key = "#email")
    public String putOtp(String email, String otp) {
        log.debug("Caching OTP for email: {}", email);
        return otp;
    }

    @Cacheable(value = "otps", key = "#email")
    public String getOtp(String email) {
        log.debug("Cache miss for email OTP: {}", email);
        return null;
    }

    @CacheEvict(value = "otps", key = "#email")
    public void evictOtp(String email) {
        log.debug("Evicting OTP cache for email: {}", email);
    }
}
