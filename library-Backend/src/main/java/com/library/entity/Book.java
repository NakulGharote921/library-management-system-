package com.library.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "books", uniqueConstraints = @UniqueConstraint(columnNames = "isbn"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @NotBlank
    @Column(nullable = false)
    private String author;

    private String category;

    @Column(unique = true)
    private String isbn;

    private String publisher;

    private Integer publicationYear;

    private String language;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String shelfLocation;

    private String coverImageUrl;

    @Column(nullable = false)
    @Builder.Default
    private Double averageRating = 0.0;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Integer totalCopies;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    private Integer availableCopies;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @JsonIgnore
    @OneToMany(mappedBy = "book", cascade = CascadeType.ALL, orphanRemoval = false)
    @Builder.Default
    private List<IssuedBook> issuedBooks = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "book", cascade = CascadeType.ALL, orphanRemoval = false)
    @Builder.Default
    private List<Reservation> reservations = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (availableCopies == null && totalCopies != null) {
            availableCopies = totalCopies;
        }
    }
}
