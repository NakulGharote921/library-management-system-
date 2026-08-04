package com.library.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssuedBookDTO {
    private Long id;
    private Long bookId;
    private String bookTitle;
    private String bookCover;
    private String bookAuthor;
    private String bookIsbn;
    private String bookCategory;
    private String bookPublisher;
    private String bookShelf;
    private Long memberId;
    private String memberName;
    private String memberEmail;
    private String issuedByName;
    private LocalDate issueDate;
    private LocalDate dueDate;
    private LocalDate returnDate;
    private LocalDate returnRequestedAt;
    private String issueStatus;
    private Double fineAmount;
    private Long reservationId;
}