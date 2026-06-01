package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailMessageDto {
    private String templateId;
    private List<String> recipientTos;
    private List<String> recipientCcs;
    private List<String> recipientBccs;
    private Map<String, Object> metadata;
    private String userId;
}
