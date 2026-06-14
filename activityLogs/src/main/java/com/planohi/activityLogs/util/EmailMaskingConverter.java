package com.planohi.activityLogs.util;

import ch.qos.logback.classic.pattern.MessageConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class EmailMaskingConverter extends MessageConverter {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}"
    );

    @Override
    public String convert(ILoggingEvent event) {
        String message = event.getFormattedMessage();
        if (message == null) {
            return null;
        }

        Matcher matcher = EMAIL_PATTERN.matcher(message);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String email = matcher.group();
            matcher.appendReplacement(sb, Matcher.quoteReplacement(MaskingUtil.maskEmail(email)));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}
