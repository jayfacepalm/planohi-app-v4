package com.planohi.api.util;

import ch.qos.logback.classic.spi.ILoggingEvent;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

class EmailMaskingConverterTest {

    @Test
    void testConvert() {
        ILoggingEvent event = Mockito.mock(ILoggingEvent.class);
        when(event.getFormattedMessage()).thenReturn("User tester@example.com logged in successfully");

        EmailMaskingConverter converter = new EmailMaskingConverter();
        String result = converter.convert(event);

        assertEquals("User t*****@***ple.com logged in successfully", result);
    }
}
