package com.library.controller;

import com.library.dto.AuthRequest;
import com.library.dto.AuthResponse;
import com.library.dto.RegisterRequest;
import com.library.entity.User;
import com.library.exception.BusinessException;
import com.library.repository.UserRepository;
import com.library.security.JwtTokenProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${GOOGLE_CLIENT_ID:}")
    private String googleClientId;

    @GetMapping("/config")
    public Map<String, Object> config() {
        return Map.of(
                "googleOAuthEnabled",
                googleClientId != null && !googleClientId.isBlank());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("User not found"));
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        log.info("User {} logged in successfully", user.getEmail());
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        return ResponseEntity.ok(AuthResponse.fromUser(user, token));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Email already registered");
        }
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(User.Role.MEMBER)
                .active(true)
                .enrollmentDate(LocalDate.now())
                .build();
        user = userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        return ResponseEntity.status(HttpStatus.CREATED).body(AuthResponse.fromUser(user, token));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(Principal principal) {
        if (principal == null) {
            throw new BusinessException("Authentication is required");
        }
        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new BusinessException("User not found"));
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        return ResponseEntity.ok(AuthResponse.fromUser(user, token));
    }
}
