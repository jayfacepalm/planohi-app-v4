package com.planohi.api.exception;

import com.planohi.api.dto.ApiResponse;
import com.planohi.api.dto.ChangeProposalResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> 
            errors.put(error.getField(), error.getDefaultMessage())
        );
        log.warn("Validation constraints failed: {}", errors);
        ApiResponse<Map<String, String>> response = ApiResponse.failed("Validation failed", errors);
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(FieldValidationException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleFieldValidationException(FieldValidationException ex) {
        log.warn("Field validation failed: {}", ex.getErrors());
        ApiResponse<Map<String, String>> response = ApiResponse.failed(ex.getMessage(), ex.getErrors());
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFoundException(EntityNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        ApiResponse<Void> response = ApiResponse.failed(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(InvalidOtpException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidOtpException(InvalidOtpException ex) {
        log.warn("OTP validation failed: {}", ex.getMessage());
        ApiResponse<Void> response = ApiResponse.failed(ex.getMessage());
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<ApiResponse<Void>> handleUserAlreadyExistsException(UserAlreadyExistsException ex) {
        log.warn("User already exists: {}", ex.getMessage());
        ApiResponse<Void> response = ApiResponse.failed(ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Illegal argument or validation failed: {}", ex.getMessage());
        ApiResponse<Void> response = ApiResponse.failed(ex.getMessage());
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(ProposalSubmittedException.class)
    public ResponseEntity<ApiResponse<ChangeProposalResponseDto>> handleProposalSubmittedException(ProposalSubmittedException ex) {
        log.info("Change proposal submitted: {}", ex.getProposal().getId());
        ApiResponse<ChangeProposalResponseDto> response = ApiResponse.success(ex.getMessage(), ex.getProposal());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception ex) {
        log.error("An unexpected error occurred", ex);
        ApiResponse<Void> response = ApiResponse.failed("An unexpected error occurred on the server.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
