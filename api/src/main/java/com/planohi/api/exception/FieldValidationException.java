package com.planohi.api.exception;

import lombok.Getter;
import java.util.Map;

@Getter
public class FieldValidationException extends RuntimeException {
    private final Map<String, String> errors;

    public FieldValidationException(String field, String message) {
        super(message);
        this.errors = Map.of(field, message);
    }

    public FieldValidationException(Map<String, String> errors) {
        super("Validation failed");
        this.errors = errors;
    }
}
