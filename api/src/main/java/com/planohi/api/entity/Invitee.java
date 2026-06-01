package com.planohi.api.entity;

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
@Table(name = "invitee")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Invitee extends BaseAuditEntity {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "token", nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "allowed_guests", nullable = false)
    private Integer allowedGuests;

    @Column(name = "attending_guests", nullable = false)
    private Integer attendingGuests;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "responded_at")
    private Instant respondedAt;
}
