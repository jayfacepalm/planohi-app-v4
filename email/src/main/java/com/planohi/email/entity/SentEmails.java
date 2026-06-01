package com.planohi.email.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sent_emails")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SentEmails {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "template_id", length = 100, nullable = false)
    private String templateId;

    @Column(name = "recipient_tos", nullable = false, columnDefinition = "TEXT")
    private String recipientTos;

    @Column(name = "recipient_ccs", columnDefinition = "TEXT")
    private String recipientCcs;

    @Column(name = "recipient_bccs", columnDefinition = "TEXT")
    private String recipientBccs;

    @Column(name = "subject", length = 255, nullable = false)
    private String subject;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "status", length = 50, nullable = false)
    private String status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "triggered_by", length = 255, nullable = false)
    private String triggeredBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
