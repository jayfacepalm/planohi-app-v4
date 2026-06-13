package com.planohi.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planohi.api.config.ApiKeyFilter;
import com.planohi.api.dto.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ApiKeyFilterTest {

    private ApiKeyFilter apiKeyFilter;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private final String testApiKey = "test-secret-key";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        apiKeyFilter = new ApiKeyFilter(testApiKey);
    }

    @Test
    void doFilterInternal_validApiKey_continuesChain() throws Exception {
        when(request.getHeader("X-API-Key")).thenReturn(testApiKey);

        ReflectionTestUtils.invokeMethod(apiKeyFilter, "doFilterInternal", request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(response, never()).setStatus(anyInt());
    }

    @Test
    void doFilterInternal_invalidApiKey_returns401() throws Exception {
        when(request.getHeader("X-API-Key")).thenReturn("wrong-key");

        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(printWriter);

        ReflectionTestUtils.invokeMethod(apiKeyFilter, "doFilterInternal", request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(response).setContentType("application/json");
        verify(response).setCharacterEncoding("UTF-8");
        verify(filterChain, never()).doFilter(any(), any());

        ApiResponse<?> expectedResponse = ApiResponse.failed("Invalid or missing API key");
        String expectedJson = objectMapper.writeValueAsString(expectedResponse);
        assertEquals(expectedJson, stringWriter.toString().trim());
    }

    @Test
    void doFilterInternal_missingApiKey_returns401() throws Exception {
        when(request.getHeader("X-API-Key")).thenReturn(null);

        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(printWriter);

        ReflectionTestUtils.invokeMethod(apiKeyFilter, "doFilterInternal", request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(response).setContentType("application/json");
        verify(response).setCharacterEncoding("UTF-8");
        verify(filterChain, never()).doFilter(any(), any());

        ApiResponse<?> expectedResponse = ApiResponse.failed("Invalid or missing API key");
        String expectedJson = objectMapper.writeValueAsString(expectedResponse);
        assertEquals(expectedJson, stringWriter.toString().trim());
    }

    @Test
    void shouldNotFilter_exemptPaths_returnsTrue() throws Exception {
        assertTrue(Boolean.TRUE.equals(ReflectionTestUtils.invokeMethod(apiKeyFilter, "shouldNotFilter", mockRequest("/swagger-ui/index.html"))));
        assertTrue(Boolean.TRUE.equals(ReflectionTestUtils.invokeMethod(apiKeyFilter, "shouldNotFilter", mockRequest("/v3/api-docs"))));
        assertTrue(Boolean.TRUE.equals(ReflectionTestUtils.invokeMethod(apiKeyFilter, "shouldNotFilter", mockRequest("/actuator/health"))));
        assertTrue(Boolean.TRUE.equals(ReflectionTestUtils.invokeMethod(apiKeyFilter, "shouldNotFilter", mockRequest("/not-api-path"))));
        assertFalse(Boolean.TRUE.equals(ReflectionTestUtils.invokeMethod(apiKeyFilter, "shouldNotFilter", mockRequest("/api/events"))));
    }

    @Test
    void constructor_invalidApiKey_throwsException() {
        assertThrows(IllegalArgumentException.class, () -> new ApiKeyFilter(null));
        assertThrows(IllegalArgumentException.class, () -> new ApiKeyFilter(""));
        assertThrows(IllegalArgumentException.class, () -> new ApiKeyFilter("   "));
    }

    private HttpServletRequest mockRequest(String uri) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRequestURI()).thenReturn(uri);
        return req;
    }
}
