package com.library.controller;

import com.library.entity.User;
import com.library.entity.WishlistItem;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;
    private final UserRepository userRepository;

    @GetMapping
    public List<WishlistItem> getWishlist(Principal principal) {
        return wishlistService.getWishlist(principal.getName());
    }

    @GetMapping("/filter")
    public List<WishlistItem> getFilteredWishlist(
            Principal principal,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String search) {
        return wishlistService.getFilteredWishlist(principal.getName(), category, author, sort, search);
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats(Principal principal) {
        return wishlistService.getWishlistStats(principal.getName());
    }

    @GetMapping("/recommended")
    public List<Map<String, Object>> getRecommended(Principal principal) {
        return wishlistService.getRecommendedBooks(principal.getName());
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(wishlistService.getAdminAnalytics());
    }

    @PostMapping("/{bookId}")
    public ResponseEntity<WishlistItem> addToWishlist(@PathVariable Long bookId, Principal principal) {
        WishlistItem item = wishlistService.addToWishlist(principal.getName(), bookId);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }

    @DeleteMapping("/{bookId}")
    public ResponseEntity<Void> removeFromWishlist(@PathVariable Long bookId, Principal principal) {
        wishlistService.removeFromWishlist(principal.getName(), bookId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{bookId}/priority")
    public ResponseEntity<WishlistItem> updatePriority(
            @PathVariable Long bookId,
            @RequestBody Map<String, String> body,
            Principal principal) {
        WishlistItem item = wishlistService.updatePriority(principal.getName(), bookId, body.get("priority"));
        return ResponseEntity.ok(item);
    }

    @PutMapping("/{bookId}/notes")
    public ResponseEntity<WishlistItem> updateNotes(
            @PathVariable Long bookId,
            @RequestBody Map<String, String> body,
            Principal principal) {
        WishlistItem item = wishlistService.updateNotes(principal.getName(), bookId, body.get("notes"));
        return ResponseEntity.ok(item);
    }

    @PutMapping("/{bookId}/notify")
    public ResponseEntity<WishlistItem> toggleNotification(
            @PathVariable Long bookId,
            @RequestBody Map<String, Boolean> body,
            Principal principal) {
        WishlistItem item = wishlistService.toggleNotification(principal.getName(), bookId,
                body.getOrDefault("notify", false));
        return ResponseEntity.ok(item);
    }
}