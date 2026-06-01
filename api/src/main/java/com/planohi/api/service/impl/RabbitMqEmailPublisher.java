package com.planohi.api.service.impl;

import com.planohi.api.config.RabbitMqConfig;
import com.planohi.api.dto.EmailMessageDto;
import com.planohi.api.service.EmailPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RabbitMqEmailPublisher implements EmailPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishEmail(EmailMessageDto message) {
        log.info("Attempting to publish email message to RabbitMQ. Template: {}, Recipient: {}", 
                message.getTemplateId(), message.getRecipientTos());
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMqConfig.EXCHANGE,
                    RabbitMqConfig.ROUTING_KEY,
                    message
            );
            log.info("Successfully published email message to RabbitMQ queue.");
        } catch (Exception e) {
            log.warn("Failed to publish email message to RabbitMQ. Isolating failure to prevent blocking API write. Error: {}", 
                    e.getMessage(), e);
        }
    }
}
