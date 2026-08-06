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
import java.util.UUID;

@Entity
@Table(name = "workspace_comment")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceComment extends BaseAuditEntity {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "target_type", nullable = false, length = 50)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "author_alias", nullable = false, length = 100)
    private String authorAlias;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;
}
