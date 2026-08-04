package com.library.controller;

import com.library.dto.IssuedBookDTO;
import com.library.dto.IssueBookRequest;
import com.library.entity.Fine;
import com.library.entity.IssuedBook;
import com.library.entity.User;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.service.IssuedBookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/issued-books")
@RequiredArgsConstructor
public class IssuedBookController {

    private final IssuedBookService issuedBookService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<IssuedBookDTO>> getAll(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(issuedBookService.getAllIssuedBooks());
    }

    @GetMapping("/active")
    public ResponseEntity<List<IssuedBookDTO>> getActive(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(issuedBookService.getActiveIssuedBooks());
    }

    @GetMapping("/returned")
    public ResponseEntity<List<IssuedBookDTO>> getReturned(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(issuedBookService.getReturnedIssuedBooks());
    }

    @GetMapping("/my")
    public ResponseEntity<List<IssuedBookDTO>> myBooks(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        return ResponseEntity.ok(issuedBookService.getIssuedBooksByUser(user.getId()));
    }

    @PostMapping("/issue")
    public ResponseEntity<IssuedBookDTO> issue(@Valid @RequestBody IssueBookRequest request, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        IssuedBook saved = issuedBookService.issueBook(request.getBookId(), request.getUserId(), request.getIssueDate(), request.getReturnDate());
        log.info("Admin {} issued book id={} to user id={}", auth.getName(), request.getBookId(), request.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(saved));
    }

    @PutMapping("/return/{id}")
    public ResponseEntity<IssuedBookDTO> returnBook(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        IssuedBook returned = issuedBookService.returnBook(id);
        log.info("Admin {} returned issued book id={}", auth.getName(), id);
        return ResponseEntity.ok(toDTO(returned));
    }

    @PostMapping("/{id}/return-request")
    public ResponseEntity<IssuedBookDTO> requestReturn(@PathVariable Long id, Authentication auth) {
        IssuedBook requested = issuedBookService.requestReturn(id, auth.getName());
        log.info("User {} requested return for issued book id={}", auth.getName(), id);
        return ResponseEntity.ok(toDTO(requested));
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<IssuedBookDTO>> overdue(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(issuedBookService.getOverdueBooks().stream().map(this::toDTO).collect(Collectors.toList()));
    }

    @PostMapping("/{id}/reminder")
    public ResponseEntity<Map<String, String>> sendReminder(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        issuedBookService.sendOverdueReminder(id);
        log.info("Staff {} sent due/overdue reminder for issued book id={}", auth.getName(), id);
        return ResponseEntity.ok(Map.of("message", "Reminder sent to the member"));
    }

    @PostMapping("/{id}/generate-fine")
    public ResponseEntity<Fine> generateFine(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Fine fine = issuedBookService.generateOverdueFineFor(id);
        log.info("Staff {} generated fine id={} for issued book id={}", auth.getName(), fine.getId(), id);
        return ResponseEntity.ok(fine);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<IssuedBookDTO>> byUser(@PathVariable Long userId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(issuedBookService.getIssuedBooksByUser(userId));
    }

    private IssuedBookDTO toDTO(IssuedBook issued) {
        return IssuedBookDTO.builder()
                .id(issued.getId())
                .bookId(issued.getBook() != null ? issued.getBook().getId() : null)
                .bookTitle(issued.getBook() != null ? issued.getBook().getTitle() : "Unknown Book")
                .bookCover(issued.getBook() != null ? issued.getBook().getCoverImageUrl() : null)
                .bookAuthor(issued.getBook() != null ? issued.getBook().getAuthor() : null)
                .bookIsbn(issued.getBook() != null ? issued.getBook().getIsbn() : null)
                .bookCategory(issued.getBook() != null ? issued.getBook().getCategory() : null)
                .bookPublisher(issued.getBook() != null ? issued.getBook().getPublisher() : null)
                .bookShelf(issued.getBook() != null ? issued.getBook().getShelfLocation() : null)
                .memberId(issued.getUser() != null ? issued.getUser().getId() : null)
                .memberName(issued.getUser() != null ? issued.getUser().getName() : null)
                .memberEmail(issued.getUser() != null ? issued.getUser().getEmail() : null)
                .issuedByName(null)
                .issueDate(issued.getIssueDate())
                .dueDate(issued.getDueDate())
                .returnDate(issued.getReturnDate())
                .returnRequestedAt(issued.getReturnRequestedAt())
                .issueStatus(issued.getStatus())
                .fineAmount(null)
                .reservationId(null)
                .build();
    }
}