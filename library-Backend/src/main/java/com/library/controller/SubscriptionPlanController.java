package com.library.controller;

import com.library.entity.SubscriptionPlan;
import com.library.exception.ResourceNotFoundException;
import com.library.service.SubscriptionPlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subscription-plans")
@RequiredArgsConstructor
public class SubscriptionPlanController {

    private final SubscriptionPlanService planService;

    private boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    private ResponseEntity<Map<String, Object>> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "status", HttpStatus.FORBIDDEN.value(),
                        "error", "Forbidden",
                        "message", "You do not have permission to manage membership plans."
                ));
    }

    @GetMapping
    public List<SubscriptionPlan> getAll() {
        return planService.getActivePlans();
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllAdmin(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        return ResponseEntity.ok(planService.getAllPlans());
    }

    @GetMapping("/{id}")
    public SubscriptionPlan getById(@PathVariable Long id) {
        return planService.getPlanById(id);
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody SubscriptionPlan plan, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        SubscriptionPlan saved = planService.createPlan(plan);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id, @Valid @RequestBody SubscriptionPlan plan, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        return ResponseEntity.ok(planService.updatePlan(id, plan));
    }

    @PostMapping("/{id}/retire")
    public ResponseEntity<?> retire(@PathVariable Long id, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        planService.retirePlan(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<?> activate(@PathVariable Long id, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        planService.activatePlan(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        planService.deletePlan(id);
        return ResponseEntity.noContent().build();
    }
}
