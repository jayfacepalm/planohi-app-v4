package com.planohi.email.util;

import ch.qos.logback.classic.spi.ILoggingEvent;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

class EmailMaskingConverterTest {

    @Test
    void testConvert() {
        ILoggingEvent event = Mockito.mock(ILoggingEvent.class);
        when(event.getFormattedMessage()).thenReturn("Sending email to recipient@example.com with status SUCCESS");

        EmailMaskingConverter converter = new EmailMaskingConverter();
        String result = converter.convert(event);

        assertEquals("Sending email to r********@***ple.com with status SUCCESS", result);
    }
}
