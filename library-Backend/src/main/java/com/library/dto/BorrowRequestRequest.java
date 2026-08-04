package com.library.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BorrowRequestRequest {
    @NotNull(message = "bookId is required")
    private Long bookId;

    private LocalDate borrowStartDate;

    private LocalDate dueDate;
}