package com.library.controller;

import com.library.dto.BorrowRequestDTO;
import com.library.dto.BorrowRequestDecisionInfo;
import com.library.dto.BorrowRequestRequest;
import com.library.entity.User;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.service.BorrowRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/borrow-requests")
@RequiredArgsConstructor
public class BorrowRequestController {

    private static final String FORBIDDEN_MESSAGE = "You do not have permission to access this resource";

    private final BorrowRequestService borrowRequestService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<BorrowRequestDTO> requestBorrow(
            @Valid @RequestBody BorrowRequestRequest request,
            Principal principal) {
        BorrowRequestDTO dto = borrowRequestService.requestBorrow(principal.getName(), request.getBookId(), request.getBorrowStartDate(), request.getDueDate());
        log.info("User {} submitted borrow request for book id={} starting {} due {}",
                principal.getName(), request.getBookId(), request.getBorrowStartDate(), request.getDueDate());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/my")
    public ResponseEntity<List<BorrowRequestDTO>> getMyRequests(Principal principal) {
        return ResponseEntity.ok(borrowRequestService.getMyRequests(principal.getName()));
    }

    @GetMapping("/admin/all")
    public ResponseEntity<List<BorrowRequestDTO>> getAllRequests(
            Authentication auth,
            @RequestParam(required = false) String status) {
        requireStaff(auth);
        return ResponseEntity.ok(borrowRequestService.getAllRequests(status));
    }

    @GetMapping("/admin/stats")
    public ResponseEntity<Map<String, Long>> getStats(Authentication auth) {
        requireStaff(auth);
        return ResponseEntity.ok(borrowRequestService.getStats());
    }

    @GetMapping("/admin/{id}/approval-info")
    public ResponseEntity<BorrowRequestDecisionInfo> getDecisionInfo(@PathVariable Long id, Authentication auth) {
        requireStaff(auth);
        return ResponseEntity.ok(borrowRequestService.getDecisionInfo(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<BorrowRequestDTO> cancel(@PathVariable Long id, Principal principal) {
        BorrowRequestDTO dto = borrowRequestService.cancel(id, principal.getName());
        log.info("User {} cancelled borrow request id={}", principal.getName(), id);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/admin/pending-count")
    public ResponseEntity<Map<String, Long>> getPendingCount(Authentication auth) {
        requireStaff(auth);
        return ResponseEntity.ok(Map.of("pending", borrowRequestService.countPending()));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<BorrowRequestDTO> approve(
            @PathVariable Long id, Authentication auth) {
        requireStaff(auth);
        BorrowRequestDTO dto = borrowRequestService.approve(id, auth.getName());
        log.info("Staff {} approved borrow request id={}", auth.getName(), id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<BorrowRequestDTO> reject(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        requireStaff(auth);
        String reason = body == null ? null : body.get("reason");
        BorrowRequestDTO dto = borrowRequestService.reject(id, auth.getName(), reason);
        log.info("Staff {} rejected borrow request id={}", auth.getName(), id);
        return ResponseEntity.ok(dto);
    }

    private User requireStaff(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            throw new BusinessException(HttpStatus.FORBIDDEN, FORBIDDEN_MESSAGE);
        }
        return user;
    }
}