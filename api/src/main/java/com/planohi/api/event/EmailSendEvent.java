package com.planohi.api.event;

import com.planohi.api.dto.EmailMessageDto;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class EmailSendEvent extends ApplicationEvent {
    private final EmailMessageDto message;

    public EmailSendEvent(Object source, EmailMessageDto message) {
        super(source);
        this.message = message;
    }
}
