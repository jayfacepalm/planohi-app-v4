package com.planohi.api.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.planohi.api.util.MaskedEmailSerializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private UUID id;

    @JsonSerialize(using = MaskedEmailSerializer.class)
    private String email;

    private String alias;
}
