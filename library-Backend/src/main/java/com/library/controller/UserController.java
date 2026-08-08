package com.library.controller;

import com.library.dto.MemberProfileDto;
import com.library.dto.NotificationDTO;
import com.library.dto.ReadingHistoryDTO;
import com.library.dto.ReadingStatsDTO;
import com.library.dto.ReservationDTO;
import com.library.dto.UserRequest;
import com.library.dto.UserResponse;
import com.library.dto.UserStatusRequest;
import com.library.dto.UsersOverviewDto;
import com.library.entity.IssuedBook;
import com.library.entity.PaymentTransaction;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.IssuedBookRepository;
import com.library.repository.UserRepository;
import com.library.service.NotificationService;
import com.library.service.PaymentService;
import com.library.service.ReadingHistoryService;
import com.library.service.ReservationService;
import com.library.service.SubscriptionService;
import com.library.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final IssuedBookRepository issuedBookRepository;
    private final PaymentService paymentService;
    private final NotificationService notificationService;
    private final ReadingHistoryService readingHistoryService;
    private final ReservationService reservationService;
    private final SubscriptionService subscriptionService;

    @GetMapping("/me")
    public User getProfile(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
    }

    @PutMapping("/me")
    public User updateProfile(Authentication auth, @Valid @RequestBody User incoming) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (!user.getEmail().equalsIgnoreCase(incoming.getEmail())) {
            userRepository.findByEmail(incoming.getEmail()).ifPresent(s -> {
                throw new BusinessException("Email already registered");
            });
        }
        user.setName(incoming.getName());
        user.setPhone(incoming.getPhone());
        if (incoming.getEnrollmentDate() != null) {
            user.setEnrollmentDate(incoming.getEnrollmentDate());
        }
        return userRepository.save(user);
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteProfile(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() == User.Role.ADMIN) {
            throw new BusinessException("Cannot delete your own admin account");
        }
        boolean hasActive = issuedBookRepository.findByUser(user).stream()
                .anyMatch(ib -> IssuedBook.STATUS_ISSUED.equals(ib.getStatus()));
        if (hasActive) {
            throw new BusinessException("Cannot delete user with active book issues");
        }
        userRepository.delete(user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/overview")
    public ResponseEntity<UsersOverviewDto> getUsersOverview(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.getUserOverview());
    }

    @GetMapping("/paginated")
    public ResponseEntity<Page<UserResponse>> getUsersPaginated(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String subscriptionPlan,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String borrowStatus,
            @RequestParam(required = false) String sort) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.getUsersFiltered(
                page, size, role, active, subscriptionPlan, keyword, status, borrowStatus, sort));
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN && !user.getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/{id}/profile")
    public ResponseEntity<MemberProfileDto> getMemberProfile(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.getMemberProfile(id));
    }

    @GetMapping("/{id}/payments")
    public ResponseEntity<List<PaymentTransaction>> getMemberPayments(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        User target = userService.getUserById(id);
        return ResponseEntity.ok(paymentService.getUserTransactions(target));
    }

    @GetMapping("/{id}/notifications")
    public ResponseEntity<List<NotificationDTO>> getMemberNotifications(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(notificationService.getUserNotifications(id));
    }

    @GetMapping("/{id}/reading-history")
    public ResponseEntity<List<ReadingHistoryDTO>> getMemberReadingHistory(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(readingHistoryService.getHistoryByUser(id));
    }

    @GetMapping("/{id}/reading-history/stats")
    public ResponseEntity<ReadingStatsDTO> getMemberReadingStats(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(readingHistoryService.getStatsByUser(id));
    }

    @GetMapping("/{id}/reservations")
    public ResponseEntity<List<ReservationDTO>> getMemberReservations(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(reservationService.getReservationsByUser(id));
    }

    @GetMapping("/{id}/subscriptions")
    public ResponseEntity<List<UserSubscription>> getMemberSubscriptions(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        User target = userService.getUserById(id);
        return ResponseEntity.ok(subscriptionService.getUserSubscriptions(target));
    }

    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody UserRequest request, Authentication auth) {
        User currentUser = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (currentUser.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        User saved = userService.addUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @Valid @RequestBody UserRequest request, Authentication auth) {
        User currentUser = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (currentUser.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<User> updateUserStatus(@PathVariable Long id,
                                                 @Valid @RequestBody UserStatusRequest request,
                                                 Authentication auth) {
        User currentUser = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (currentUser.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.updateStatus(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, Authentication auth) {
        User currentUser = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (currentUser.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<User>> searchUsers(
            @RequestParam String keyword, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.searchUsers(keyword));
    }
}
