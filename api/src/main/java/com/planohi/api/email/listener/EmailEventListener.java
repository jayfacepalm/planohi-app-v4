package com.planohi.api.email.listener;

import com.planohi.api.event.EmailSendEvent;
import com.planohi.api.email.service.EmailSenderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailEventListener {

    private final EmailSenderService emailSenderService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleEmailSendEvent(EmailSendEvent event) {
        log.info("Processing EmailSendEvent asynchronously for template: {}", event.getMessage().getTemplateId());
        try {
            emailSenderService.processAndSendEmail(event.getMessage());
        } catch (Exception e) {
            log.error("Failed to handle EmailSendEvent for template: {}", event.getMessage().getTemplateId(), e);
        }
    }
}
