package com.library.controller;

import com.library.dto.AuditLogDTO;
import com.library.entity.User;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private static final String FORBIDDEN_MESSAGE = "You do not have permission to access this resource";

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<AuditLogDTO>> getAll(Authentication auth) {
        User user = requireAdmin(auth);
        List<AuditLogDTO> logs = auditLogService.getAll().stream()
                .map(AuditLogDTO::fromEntity)
                .collect(Collectors.toList());
        log.info("Admin {} fetched {} audit log entries", user.getEmail(), logs.size());
        return ResponseEntity.ok(logs);
    }

    private User requireAdmin(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            throw new BusinessException(HttpStatus.FORBIDDEN, FORBIDDEN_MESSAGE);
        }
        return user;
    }
}
