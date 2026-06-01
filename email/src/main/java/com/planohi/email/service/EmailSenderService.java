package com.planohi.email.service;

import com.planohi.email.dto.EmailMessageDto;

public interface EmailSenderService {
    void processAndSendEmail(EmailMessageDto message);
}
