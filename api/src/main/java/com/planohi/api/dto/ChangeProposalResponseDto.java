package com.planohi.api.dto;

import com.planohi.api.enums.ChangeProposalAction;
import com.planohi.api.enums.ChangeProposalStatus;
import com.planohi.api.enums.ChangeProposalTarget;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangeProposalResponseDto {
    private UUID id;
    private UUID eventId;
    private UUID proposedBy;
    private String proposerAlias;
    private ChangeProposalTarget targetType;
    private ChangeProposalAction actionType;
    private UUID targetId;
    private Map<String, Object> proposedData;
    private ChangeProposalStatus status;
    private UUID reviewedBy;
    private Instant reviewedAt;
    private Instant createdAt;
}
