package com.library.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    @GetMapping(value = "/", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> root() {
        return Map.of(
                "service", "Library Management API",
                "status", "UP",
                "docs", "Login: POST /api/auth/login, Register: POST /api/auth/register, Books: GET /api/books");
    }
}
