package com.planohi.email.service.impl;

import com.planohi.email.dto.EmailMessageDto;
import com.planohi.email.entity.EmailTemplate;
import com.planohi.email.entity.SentEmails;
import com.planohi.email.repository.EmailTemplateRepository;
import com.planohi.email.repository.SentEmailsRepository;
import com.planohi.email.service.EmailSenderService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailSenderServiceImpl implements EmailSenderService {

    @Value("${app.mail.from-address:no-reply@planohi.com}")
    private String fromAddress;

    private final EmailTemplateRepository emailTemplateRepository;
    private final SentEmailsRepository sentEmailsRepository;
    private final JavaMailSender mailSender;
    private final Environment env;

    @Override
    @Transactional
    public void processAndSendEmail(EmailMessageDto message) {
        log.info("Processing email sending request for template: {}", message.getTemplateId());

        String subject = "";
        String body = "";
        String status = "SUCCESS";
        String errorMessage = null;

        try {
            // 1. Fetch template from DB/Cache
            EmailTemplate template = emailTemplateRepository.findById(message.getTemplateId())
                    .orElseThrow(() -> new IllegalArgumentException("Email template not found: " + message.getTemplateId()));

            // 2. Perform placeholder substitution
            subject = replacePlaceholders(template.getSubjectTemplate(), message.getMetadata());
            body = replacePlaceholders(template.getBodyTemplate(), message.getMetadata());

            String prefix = getSubjectPrefix();
            if (!prefix.isEmpty()) {
                subject = prefix + " " + subject;
            }

            // 3. Construct and send HTML MIME message
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(message.getRecipientTos().toArray(new String[0]));
            
            if (message.getRecipientCcs() != null && !message.getRecipientCcs().isEmpty()) {
                helper.setCc(message.getRecipientCcs().toArray(new String[0]));
            }
            if (message.getRecipientBccs() != null && !message.getRecipientBccs().isEmpty()) {
                helper.setBcc(message.getRecipientBccs().toArray(new String[0]));
            }
            
            helper.setSubject(subject);
            helper.setText(body, true); // HTML email format

            mailSender.send(mimeMessage);
            log.info("Email delivered successfully to SMTP server. Recipients: {}", message.getRecipientTos());

        } catch (Exception e) {
            status = "FAILED";
            errorMessage = e.getMessage() != null ? e.getMessage() : e.getClass().getName();
            log.error("Failed to process or send email for template {}: {}", message.getTemplateId(), errorMessage, e);
        }

        // 4. Log sending outcome to DB
        try {
            SentEmails sentEmail = SentEmails.builder()
                    .templateId(message.getTemplateId())
                    .recipientTos(String.join(",", message.getRecipientTos()))
                    .recipientCcs(message.getRecipientCcs() != null ? String.join(",", message.getRecipientCcs()) : null)
                    .recipientBccs(message.getRecipientBccs() != null ? String.join(",", message.getRecipientBccs()) : null)
                    .subject(subject)
                    .body(body)
                    .status(status)
                    .errorMessage(errorMessage)
                    .triggeredBy(message.getUserId() != null ? message.getUserId() : "SYSTEM")
                    .createdAt(Instant.now())
                    .build();

            sentEmailsRepository.save(sentEmail);
            log.debug("Logged email sending outcome with status: {}", status);
        } catch (Exception dbEx) {
            log.error("Failed to write sent email log to database", dbEx);
        }
    }

    private String replacePlaceholders(String template, Map<String, Object> metadata) {
        if (template == null) {
            return "";
        }
        if (metadata == null || metadata.isEmpty()) {
            return template;
        }
        String result = template;
        for (Map.Entry<String, Object> entry : metadata.entrySet()) {
            String placeholder = "${" + entry.getKey() + "}";
            String value = entry.getValue() != null ? entry.getValue().toString() : "";
            result = result.replace(placeholder, value);
        }
        return result;
    }

    private String getSubjectPrefix() {
        for (String profile : env.getActiveProfiles()) {
            if ("staging".equalsIgnoreCase(profile)) {
                return "[staging Testing]";
            } else if ("dev".equalsIgnoreCase(profile)) {
                return "[dev Testing]";
            }
        }
        return "";
    }
}
