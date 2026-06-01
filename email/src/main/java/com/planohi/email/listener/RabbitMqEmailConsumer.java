package com.planohi.email.listener;

import com.planohi.email.dto.EmailMessageDto;
import com.planohi.email.service.EmailSenderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RabbitMqEmailConsumer {

    private final EmailSenderService emailSenderService;

    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "email.send.queue", durable = "true"),
            exchange = @Exchange(value = "email.exchange", type = "direct"),
            key = "email.send"
    ))
    public void receiveEmailMessage(EmailMessageDto message) {
        log.info("Received email message from RabbitMQ queue. Template: {}", message.getTemplateId());
        try {
            emailSenderService.processAndSendEmail(message);
        } catch (Exception e) {
            log.error("Failed to process consumed email message for template: {}", message.getTemplateId(), e);
        }
    }
}
