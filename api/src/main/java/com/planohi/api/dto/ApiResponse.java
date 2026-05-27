package com.planohi.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private String status;
    private String msg;
    private T result;

    public static <T> ApiResponse<T> success(String msg, T result) {
        return new ApiResponse<>("SUCCESS", msg, result);
    }

    public static <T> ApiResponse<T> success(T result) {
        return success("Request processed successfully", result);
    }

    public static <T> ApiResponse<T> failed(String msg, T result) {
        return new ApiResponse<>("FAILED", msg, result);
    }

    public static <T> ApiResponse<Void> failed(String msg) {
        return failed(msg, null);
    }
}
