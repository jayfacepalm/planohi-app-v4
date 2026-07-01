package com.planohi.api.email.service;

import com.planohi.api.dto.EmailMessageDto;

public interface EmailSenderService {
    void processAndSendEmail(EmailMessageDto message);
}
