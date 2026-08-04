package com.library.dto;

import com.library.entity.BorrowRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BorrowRequestDTO {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private Long bookId;
    private String bookTitle;
    private String bookAuthor;
    private String bookIsbn;
    private String bookCoverImageUrl;
    private String bookCategory;
    private String status;
    private LocalDate borrowStartDate;
    private LocalDate dueDate;
    private String membershipPlanName;
    private LocalDateTime requestDate;
    private LocalDateTime decidedAt;
    private String decisionNotes;
    private Long issuedBookId;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;

    public static BorrowRequestDTO fromEntity(BorrowRequest req) {
        return BorrowRequestDTO.builder()
                .id(req.getId())
                .userId(req.getUser().getId())
                .userName(req.getUser().getName())
                .userEmail(req.getUser().getEmail())
                .bookId(req.getBook().getId())
                .bookTitle(req.getBook().getTitle())
                .bookAuthor(req.getBook().getAuthor())
                .bookIsbn(req.getBook().getIsbn())
                .bookCoverImageUrl(req.getBook().getCoverImageUrl())
                .bookCategory(req.getBook().getCategory())
                .status(req.getStatus())
                .borrowStartDate(req.getBorrowStartDate())
                .dueDate(req.getDueDate())
                .membershipPlanName(req.getMembershipPlanName())
                .requestDate(req.getRequestDate())
                .decidedAt(req.getDecidedAt())
                .decisionNotes(req.getDecisionNotes())
                .issuedBookId(req.getIssuedBookId())
                .cancelledAt(req.getCancelledAt())
                .createdAt(req.getCreatedAt())
                .build();
    }
}