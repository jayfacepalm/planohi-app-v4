package com.planohi.api.service.impl;

import com.planohi.api.dto.EmailMessageDto;
import com.planohi.api.event.EmailSendEvent;
import com.planohi.api.service.EmailPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SpringEventEmailPublisher implements EmailPublisher {
    
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public void publishEmail(EmailMessageDto message) {
        eventPublisher.publishEvent(new EmailSendEvent(this, message));
    }
}
