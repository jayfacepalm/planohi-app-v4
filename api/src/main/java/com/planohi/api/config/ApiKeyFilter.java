package com.planohi.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planohi.api.dto.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    private final String apiKey;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ApiKeyFilter(@Value("${security.api-key}") String apiKey) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalArgumentException("CRITICAL: security.api-key is not configured. The application cannot start without a valid API key.");
        }
        this.apiKey = apiKey;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();

        // Enforce X-API-Key verification only for endpoints under /api/**, except for Swagger and Actuator endpoints
        return !path.startsWith("/api/") ||
               path.startsWith("/swagger-ui") || 
               path.startsWith("/v3/api-docs") || 
               path.startsWith("/actuator");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String requestApiKey = request.getHeader("X-API-Key");

        if (apiKey == null || apiKey.trim().isEmpty() || !apiKey.equals(requestApiKey)) {
            log.warn("Unauthorized API request to {} without valid API key. Received: {}", request.getRequestURI(), requestApiKey);
            
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            
            ApiResponse<Void> apiResponse = ApiResponse.failed("Invalid or missing API key");
            response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
            return;
        }

        filterChain.doFilter(request, response);
    }
}
