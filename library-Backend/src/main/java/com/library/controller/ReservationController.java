package com.library.controller;

import com.library.dto.ReservationDTO;
import com.library.dto.ReservationRequest;
import com.library.entity.User;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private static final String FORBIDDEN_MESSAGE = "You do not have permission to access this resource";

    private final ReservationService reservationService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<ReservationDTO> reserveBook(
            @Valid @RequestBody ReservationRequest request,
            Principal principal) {
        ReservationDTO reservation = reservationService.reserveBook(
                principal.getName(), request.getBookId());
        log.info("User {} reserved book id={}", principal.getName(), request.getBookId());
        return ResponseEntity.status(HttpStatus.CREATED).body(reservation);
    }

    @GetMapping("/my")
    public ResponseEntity<List<ReservationDTO>> getMyReservations(Principal principal) {
        return ResponseEntity.ok(reservationService.getMyReservations(principal.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReservationDTO> getById(@PathVariable Long id, Authentication auth) {
        User user = currentUser(auth);
        ReservationDTO dto = reservationService.getReservationById(id);
        if (user.getRole() != User.Role.ADMIN && !dto.getUserId().equals(user.getId())) {
            throw forbidden();
        }
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/book/{bookId}")
    public ResponseEntity<List<ReservationDTO>> getByBook(@PathVariable Long bookId, Authentication auth) {
        User user = currentUser(auth);
        List<ReservationDTO> list = reservationService.getReservationsByBook(bookId);
        if (user.getRole() != User.Role.ADMIN) {
            list = list.stream()
                    .filter(dto -> dto.getUserId().equals(user.getId()))
                    .toList();
        }
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/{reservationId}")
    public ResponseEntity<Void> cancelReservation(
            @PathVariable Long reservationId,
            Principal principal) {
        reservationService.cancelReservation(reservationId, principal.getName());
        log.info("User {} cancelled reservation id={}", principal.getName(), reservationId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/queue/{bookId}")
    public ResponseEntity<?> getQueueInfo(
            @PathVariable Long bookId,
            @RequestParam(required = false) Long reservationId) {
        if (reservationId == null) {
            return ResponseEntity.ok(Map.of("queueLength", reservationService.getQueueLength(bookId)));
        }
        return ResponseEntity.ok(reservationService.getQueueInfo(bookId, reservationId));
    }

    @GetMapping("/queue/{bookId}/all")
    public ResponseEntity<List<ReservationDTO>> getWaitingQueue(
            @PathVariable Long bookId, Authentication auth) {
        requireStaff(auth);
        return ResponseEntity.ok(reservationService.getWaitingQueue(bookId));
    }

    @PutMapping("/{id}/pickup")
    public ResponseEntity<Void> markPickup(
            @PathVariable Long id, Authentication auth) {
        requireStaff(auth);
        reservationService.markAsPickedUp(id);
        log.info("Admin {} marked reservation id={} as picked up", auth.getName(), id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(Principal principal) {
        return ResponseEntity.ok(reservationService.getUserStats(principal.getName()));
    }

    @GetMapping("/admin/all")
    public ResponseEntity<List<ReservationDTO>> getAllReservationsAdmin(
            Authentication auth,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String order) {
        requireStaff(auth);
        return ResponseEntity.ok(reservationService.getAllReservations(status, keyword, sortBy, order));
    }

    @GetMapping("/admin/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats(Authentication auth) {
        requireStaff(auth);
        return ResponseEntity.ok(reservationService.getAdminStats());
    }

    @GetMapping("/admin/history")
    public ResponseEntity<List<ReservationDTO>> getHistory(
            Authentication auth,
            @RequestParam(required = false) String keyword) {
        requireStaff(auth);
        return ResponseEntity.ok(reservationService.getReservationHistory(keyword));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Void> approveReservation(
            @PathVariable Long id, Authentication auth) {
        requireStaff(auth);
        reservationService.approveReservation(id);
        log.info("Admin {} approved reservation id={}", auth.getName(), id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> adminCancelReservation(
            @PathVariable Long id, Authentication auth) {
        requireStaff(auth);
        reservationService.adminCancelReservation(id);
        log.info("Admin {} cancelled reservation id={}", auth.getName(), id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/admin/{id}/override")
    public ResponseEntity<Void> overrideQueue(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        requireAdmin(auth);
        Integer newPosition = body.get("queuePosition");
        if (newPosition == null || newPosition < 1) {
            return ResponseEntity.badRequest().build();
        }
        reservationService.overrideQueuePosition(id, newPosition);
        log.info("Admin {} overrode queue position for reservation id={}", auth.getName(), id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/admin/{id}/pickup-time")
    public ResponseEntity<?> changePickupTime(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        requireStaff(auth);
        String expiryStr = body.get("pickupExpiryDate");
        if (expiryStr == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            LocalDateTime newExpiry = LocalDateTime.parse(expiryStr);
            reservationService.changePickupTime(id, newExpiry);
            return ResponseEntity.ok().build();
        } catch (DateTimeParseException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid pickupExpiryDate format"));
        }
    }

    @PutMapping("/{id}/ready")
    public ResponseEntity<Void> markReady(
            @PathVariable Long id, Authentication auth) {
        requireStaff(auth);
        reservationService.approveReservation(id);
        log.info("Admin {} marked reservation id={} as ready", auth.getName(), id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<Void> completeReservation(
            @PathVariable Long id, Authentication auth) {
        requireStaff(auth);
        reservationService.markAsPickedUp(id);
        log.info("Admin {} completed reservation id={}", auth.getName(), id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/expire")
    public ResponseEntity<Void> expireReservation(
            @PathVariable Long id, Authentication auth) {
        requireStaff(auth);
        reservationService.adminExpireReservation(id);
        log.info("Admin {} expired reservation id={}", auth.getName(), id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/admin/{id}")
    public ResponseEntity<Void> deleteReservation(
            @PathVariable Long id, Authentication auth) {
        requireAdmin(auth);
        reservationService.deleteReservation(id);
        log.info("Admin {} deleted reservation id={}", auth.getName(), id);
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
    }

    private User requireStaff(Authentication auth) {
        User user = currentUser(auth);
        if (user.getRole() != User.Role.ADMIN) {
            throw forbidden();
        }
        return user;
    }

    private User requireAdmin(Authentication auth) {
        User user = currentUser(auth);
        if (user.getRole() != User.Role.ADMIN) {
            throw forbidden();
        }
        return user;
    }

    private BusinessException forbidden() {
        return new BusinessException(HttpStatus.FORBIDDEN, FORBIDDEN_MESSAGE);
    }
}
