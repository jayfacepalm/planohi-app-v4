package com.planohi.api.service;

import com.planohi.api.dto.EmailMessageDto;

public interface EmailPublisher {
    void publishEmail(EmailMessageDto message);
}
