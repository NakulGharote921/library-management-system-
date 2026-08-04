package com.library.dto;

import com.library.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UserRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name is too long")
        String name,

        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email")
        String email,

        String phone,

        LocalDate enrollmentDate,

        @Size(min = 6, message = "Password must be at least 6 characters")
        String password,

        User.Role role
) {
}
