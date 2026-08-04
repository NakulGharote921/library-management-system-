package com.library.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class IssueBookRequest {

    @NotNull(message = "bookId is required")
    private Long bookId;

    @NotNull(message = "userId is required")
    private Long userId;

    private String issueDate;

    private String returnDate;
}
