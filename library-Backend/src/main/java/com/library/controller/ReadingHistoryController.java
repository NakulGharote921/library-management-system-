package com.library.controller;

import com.library.dto.RatingRequest;
import com.library.dto.ReadingHistoryDTO;
import com.library.dto.ReadingStatsDTO;
import com.library.dto.ReviewRequest;
import com.library.entity.User;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.service.ReadingHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reading-history")
@RequiredArgsConstructor
public class ReadingHistoryController {

    private final ReadingHistoryService readingHistoryService;
    private final UserRepository userRepository;

    @GetMapping("/my")
    public ResponseEntity<List<ReadingHistoryDTO>> getMyHistory(
            Principal principal,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sort) {
        return ResponseEntity.ok(
                readingHistoryService.getMyHistory(principal.getName(), status, keyword, sort));
    }

    @GetMapping("/my/stats")
    public ResponseEntity<ReadingStatsDTO> getMyStats(Principal principal) {
        return ResponseEntity.ok(readingHistoryService.getMyStats(principal.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReadingHistoryDTO> getById(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        ReadingHistoryDTO dto = readingHistoryService.getById(id);
        if (user.getRole() != User.Role.ADMIN && !dto.getUserId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}/rating")
    public ResponseEntity<ReadingHistoryDTO> updateRating(
            @PathVariable Long id,
            @Valid @RequestBody RatingRequest request,
            Principal principal) {
        return ResponseEntity.ok(
                readingHistoryService.updateRating(id, request.getRating(), principal.getName()));
    }

    @PutMapping("/{id}/review")
    public ResponseEntity<ReadingHistoryDTO> updateReview(
            @PathVariable Long id,
            @Valid @RequestBody ReviewRequest request,
            Principal principal) {
        return ResponseEntity.ok(
                readingHistoryService.updateReview(id, request.getReview(), principal.getName()));
    }

    @GetMapping("/my/recommendations")
    public ResponseEntity<List<Map<String, Object>>> getRecommendations(Principal principal) {
        return ResponseEntity.ok(readingHistoryService.getRecommendations(principal.getName()));
    }
}
