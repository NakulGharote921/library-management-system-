package com.library.controller;

import com.library.entity.Fine;
import com.library.entity.User;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.service.FineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fines")
@RequiredArgsConstructor
public class FineController {

    private final FineService fineService;
    private final UserRepository userRepository;

    @GetMapping("/my")
    public List<Fine> myFines(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        return fineService.getFinesByUser(user.getId());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Fine>> userFines(
            @PathVariable Long userId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(fineService.getFinesByUser(userId));
    }

    @GetMapping
    public ResponseEntity<List<Fine>> allFines(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(fineService.getAllFines());
    }

    @PostMapping("/{fineId}/waive")
    public ResponseEntity<Fine> waiveFine(
            @PathVariable Long fineId, @RequestBody Map<String, String> body,
            Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            throw new BusinessException("Only administrators can waive fines");
        }
        String reason = body.getOrDefault("reason", "Waived by admin");
        Fine waived = fineService.waiveFine(fineId, user, reason);
        return ResponseEntity.ok(waived);
    }
}
