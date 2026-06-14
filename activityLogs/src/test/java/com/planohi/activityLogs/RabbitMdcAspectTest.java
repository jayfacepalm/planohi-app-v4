package com.planohi.activityLogs;

import com.planohi.activityLogs.config.RabbitMdcAspect;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import java.util.HashMap;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RabbitMdcAspectTest {

    @InjectMocks
    private RabbitMdcAspect rabbitMdcAspect;

    @Mock
    private ProceedingJoinPoint proceedingJoinPoint;

    @Mock
    private Message amqpMessage;

    @Mock
    private MessageProperties messageProperties;

    @BeforeEach
    void setUp() {
        MDC.clear();
    }

    @Test
    void testManageMdc_withCorrelationId_bindsToMdc() throws Throwable {
        Map<String, Object> headers = new HashMap<>();
        headers.put("X-Correlation-Id", "1234567890123456");
        
        when(proceedingJoinPoint.getArgs()).thenReturn(new Object[]{ amqpMessage });
        when(amqpMessage.getMessageProperties()).thenReturn(messageProperties);
        when(messageProperties.getHeaders()).thenReturn(headers);
        when(proceedingJoinPoint.proceed()).thenAnswer(invocation -> {
            assertEquals("1234567890123456", MDC.get("correlationId"));
            return "success";
        });

        Object result = rabbitMdcAspect.manageMdc(proceedingJoinPoint);

        assertEquals("success", result);
        assertNull(MDC.get("correlationId"));
    }

    @Test
    void testManageMdc_withoutCorrelationId_doesNotBind() throws Throwable {
        Map<String, Object> headers = new HashMap<>();
        
        when(proceedingJoinPoint.getArgs()).thenReturn(new Object[]{ amqpMessage });
        when(amqpMessage.getMessageProperties()).thenReturn(messageProperties);
        when(messageProperties.getHeaders()).thenReturn(headers);
        when(proceedingJoinPoint.proceed()).thenAnswer(invocation -> {
            assertNull(MDC.get("correlationId"));
            return "success";
        });

        Object result = rabbitMdcAspect.manageMdc(proceedingJoinPoint);

        assertEquals("success", result);
        assertNull(MDC.get("correlationId"));
    }
}
