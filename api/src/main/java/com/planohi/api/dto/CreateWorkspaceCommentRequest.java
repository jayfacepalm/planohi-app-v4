package com.planohi.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWorkspaceCommentRequest {

    @NotBlank(message = "Target type is required")
    private String targetType;

    @NotNull(message = "Target ID is required")
    private UUID targetId;

    @NotBlank(message = "Comment content cannot be blank")
    @Size(max = 1000, message = "Comment content must not exceed 1000 characters")
    private String content;
}
