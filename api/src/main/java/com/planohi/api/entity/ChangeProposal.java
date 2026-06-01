package com.planohi.api.entity;

import com.planohi.api.enums.ChangeProposalAction;
import com.planohi.api.enums.ChangeProposalStatus;
import com.planohi.api.enums.ChangeProposalTarget;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "change_proposal")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangeProposal extends BaseAuditEntity {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "proposed_by", nullable = false)
    private UUID proposedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 100)
    private ChangeProposalTarget targetType;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 50)
    private ChangeProposalAction actionType;

    @Column(name = "target_id")
    private UUID targetId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "proposed_data", columnDefinition = "jsonb")
    private Map<String, Object> proposedData;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private ChangeProposalStatus status;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;
}
