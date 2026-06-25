package com.planohi.email.service.impl;

import com.planohi.email.dto.EmailMessageDto;
import com.planohi.email.entity.EmailTemplate;
import com.planohi.email.entity.SentEmails;
import com.planohi.email.repository.EmailTemplateRepository;
import com.planohi.email.repository.SentEmailsRepository;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class EmailSenderServiceImplTest {

    private EmailTemplateRepository emailTemplateRepository;
    private SentEmailsRepository sentEmailsRepository;
    private JavaMailSender mailSender;
    private Environment env;
    private EmailSenderServiceImpl emailSenderService;

    @BeforeEach
    void setUp() {
        emailTemplateRepository = mock(EmailTemplateRepository.class);
        sentEmailsRepository = mock(SentEmailsRepository.class);
        mailSender = mock(JavaMailSender.class);
        env = mock(Environment.class);
        emailSenderService = new EmailSenderServiceImpl(
                emailTemplateRepository,
                sentEmailsRepository,
                mailSender,
                env
        );
        org.springframework.test.util.ReflectionTestUtils.setField(emailSenderService, "fromAddress", "no-reply@planohi.com");
    }

    @Test
    void testProcessAndSendEmail_whenProfileIsDev_shouldPrependPrefix() throws Exception {
        // Arrange
        when(env.getActiveProfiles()).thenReturn(new String[]{"dev"});

        EmailTemplate template = new EmailTemplate();
        template.setId("1");
        template.setSubjectTemplate("Welcome to planohi");
        template.setBodyTemplate("Hello ${name}");
        when(emailTemplateRepository.findById("1")).thenReturn(Optional.of(template));

        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        EmailMessageDto dto = new EmailMessageDto();
        dto.setTemplateId("1");
        dto.setRecipientTos(List.of("user@example.com"));
        dto.setMetadata(Map.of("name", "Alice"));

        // Act
        emailSenderService.processAndSendEmail(dto);

        // Assert
        verify(mailSender).send(mimeMessage);
        
        ArgumentCaptor<SentEmails> sentEmailsCaptor = ArgumentCaptor.forClass(SentEmails.class);
        verify(sentEmailsRepository).save(sentEmailsCaptor.capture());
        
        SentEmails loggedEmail = sentEmailsCaptor.getValue();
        assertEquals("[dev Testing] Welcome to planohi", loggedEmail.getSubject());
        assertEquals("Hello Alice", loggedEmail.getBody());
        assertEquals("SUCCESS", loggedEmail.getStatus());
    }

    @Test
    void testProcessAndSendEmail_whenProfileIsStaging_shouldPrependPrefix() throws Exception {
        // Arrange
        when(env.getActiveProfiles()).thenReturn(new String[]{"staging"});

        EmailTemplate template = new EmailTemplate();
        template.setId("1");
        template.setSubjectTemplate("Alert: System check");
        template.setBodyTemplate("Warning!");
        when(emailTemplateRepository.findById("1")).thenReturn(Optional.of(template));

        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        EmailMessageDto dto = new EmailMessageDto();
        dto.setTemplateId("1");
        dto.setRecipientTos(List.of("admin@example.com"));

        // Act
        emailSenderService.processAndSendEmail(dto);

        // Assert
        ArgumentCaptor<SentEmails> sentEmailsCaptor = ArgumentCaptor.forClass(SentEmails.class);
        verify(sentEmailsRepository).save(sentEmailsCaptor.capture());
        
        SentEmails loggedEmail = sentEmailsCaptor.getValue();
        assertEquals("[staging Testing] Alert: System check", loggedEmail.getSubject());
    }

    @Test
    void testProcessAndSendEmail_whenProfileIsProd_shouldNotPrependPrefix() throws Exception {
        // Arrange
        when(env.getActiveProfiles()).thenReturn(new String[]{"prod"});

        EmailTemplate template = new EmailTemplate();
        template.setId("1");
        template.setSubjectTemplate("Alert: System check");
        template.setBodyTemplate("Warning!");
        when(emailTemplateRepository.findById("1")).thenReturn(Optional.of(template));

        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        EmailMessageDto dto = new EmailMessageDto();
        dto.setTemplateId("1");
        dto.setRecipientTos(List.of("admin@example.com"));

        // Act
        emailSenderService.processAndSendEmail(dto);

        // Assert
        ArgumentCaptor<SentEmails> sentEmailsCaptor = ArgumentCaptor.forClass(SentEmails.class);
        verify(sentEmailsRepository).save(sentEmailsCaptor.capture());
        
        SentEmails loggedEmail = sentEmailsCaptor.getValue();
        assertEquals("Alert: System check", loggedEmail.getSubject());
    }
}
