package com.library.dto;

import jakarta.validation.constraints.NotBlank;

public record UserStatusRequest(
        @NotBlank(message = "Status is required")
        String status
) {
}
