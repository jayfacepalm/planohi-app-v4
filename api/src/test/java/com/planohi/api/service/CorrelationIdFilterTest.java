package com.planohi.api.service;

import com.planohi.api.config.CorrelationIdFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CorrelationIdFilterTest {

    private CorrelationIdFilter correlationIdFilter;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        correlationIdFilter = new CorrelationIdFilter();
        MDC.clear();
    }

    @Test
    void doFilterInternal_withExistingCorrelationId_propagatesIt() throws Exception {
        String existingId = "abc123XYZ7890def";
        when(request.getHeader("X-Correlation-Id")).thenReturn(existingId);

        // We stub filterChain to assert that MDC holds the correlation ID during request processing
        doAnswer(invocation -> {
            assertEquals(existingId, MDC.get("correlationId"));
            return null;
        }).when(filterChain).doFilter(request, response);

        ReflectionTestUtils.invokeMethod(correlationIdFilter, "doFilterInternal", request, response, filterChain);

        // Verify it sets the response header and proceeds down the chain
        verify(response).setHeader("X-Correlation-Id", existingId);
        verify(filterChain).doFilter(request, response);
        // Verify MDC is cleared after the request finishes
        assertNull(MDC.get("correlationId"));
    }

    @Test
    void doFilterInternal_withMissingCorrelationId_generatesNew16CharAlphanumericId() throws Exception {
        when(request.getHeader("X-Correlation-Id")).thenReturn(null);

        ArgumentCaptor<String> idCaptor = ArgumentCaptor.forClass(String.class);

        doAnswer(invocation -> {
            String mdcId = MDC.get("correlationId");
            assertNotNull(mdcId);
            assertEquals(16, mdcId.length());
            // Verify alphanumeric characters only
            assertTrue(mdcId.matches("^[a-zA-Z0-9]+$"));
            return null;
        }).when(filterChain).doFilter(request, response);

        ReflectionTestUtils.invokeMethod(correlationIdFilter, "doFilterInternal", request, response, filterChain);

        verify(response).setHeader(eq("X-Correlation-Id"), idCaptor.capture());
        String generatedId = idCaptor.getValue();
        assertNotNull(generatedId);
        assertEquals(16, generatedId.length());

        verify(filterChain).doFilter(request, response);
        assertNull(MDC.get("correlationId"));
    }

    @Test
    void doFilterInternal_withInvalidLengthCorrelationId_generatesNewId() throws Exception {
        // ID is too short (10 characters)
        when(request.getHeader("X-Correlation-Id")).thenReturn("1234567890");

        doAnswer(invocation -> {
            String mdcId = MDC.get("correlationId");
            assertNotNull(mdcId);
            assertEquals(16, mdcId.length());
            return null;
        }).when(filterChain).doFilter(request, response);

        ReflectionTestUtils.invokeMethod(correlationIdFilter, "doFilterInternal", request, response, filterChain);

        verify(response).setHeader(eq("X-Correlation-Id"), anyString());
        verify(filterChain).doFilter(request, response);
        assertNull(MDC.get("correlationId"));
    }
}
