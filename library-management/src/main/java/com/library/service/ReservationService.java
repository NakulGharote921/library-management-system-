package com.library.service;

import com.library.dto.ReservationDTO;
import com.library.entity.*;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final IssuedBookRepository issuedBookRepository;
    private final FineRepository fineRepository;
    private final SubscriptionService subscriptionService;
    private final NotificationService notificationService;
    private final MailService mailService;

    private static final int MAX_ACTIVE_RESERVATIONS = 5;
    private static final int ESTIMATED_DAYS_PER_PERSON = 3;
    private static final DateTimeFormatter NUMBER_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");
    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    @Transactional
    public ReservationDTO reserveBook(String userEmail, Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));

        if (!user.isActive()) {
            throw new BusinessException("Your account is suspended. Contact an administrator.");
        }

        if (book.getAvailableCopies() != null && book.getAvailableCopies() > 0) {
            throw new BusinessException("Book is available for borrowing. No reservation needed.");
        }

        List<Reservation> existing = reservationRepository
                .findByBookAndUserAndStatusIn(book, user,
                        List.of(Reservation.STATUS_PENDING, Reservation.STATUS_READY));
        if (!existing.isEmpty()) {
            throw new BusinessException("You already have an active reservation for this book.");
        }

        boolean alreadyBorrowed = issuedBookRepository
                .findByUserAndBookAndStatus(user, book, IssuedBook.STATUS_ISSUED)
                .isPresent();
        if (alreadyBorrowed) {
            throw new BusinessException("You already have this book borrowed.");
        }

        try {
            subscriptionService.validateBorrowingPrivileges(user);
        } catch (BusinessException e) {
            throw new BusinessException("Cannot reserve: " + e.getMessage());
        }

        long unpaidFines = fineRepository.countByUser_IdAndStatus(user.getId(), Fine.STATUS_UNPAID);
        if (unpaidFines > 0) {
            throw new BusinessException("You have " + unpaidFines +
                    " unpaid fine(s). Clear them before reserving.");
        }

        long activeReservations = reservationRepository.countByUserAndStatusIn(user,
                List.of(Reservation.STATUS_PENDING, Reservation.STATUS_READY));
        if (activeReservations >= MAX_ACTIVE_RESERVATIONS) {
            throw new BusinessException("Reservation limit reached (max " +
                    MAX_ACTIVE_RESERVATIONS + "). Cancel an existing reservation first.");
        }

        int nextPosition = reservationRepository.countByBookAndStatus(book, Reservation.STATUS_PENDING)
                + reservationRepository.countByBookAndStatus(book, Reservation.STATUS_READY) + 1;

        Reservation reservation = Reservation.builder()
                .book(book)
                .user(user)
                .queuePosition(nextPosition)
                .status(Reservation.STATUS_PENDING)
                .notificationSent(false)
                .build();

        Reservation saved = reservationRepository.save(reservation);
        saved.setReservationNumber(generateReservationNumber(saved.getId()));
        saved = reservationRepository.save(saved);
        log.info("Book id={} reserved by user id={}, queue position #{}, number={}",
                bookId, user.getId(), nextPosition, saved.getReservationNumber());

        notificationService.notify(user, Notification.TYPE_RESERVATION_CREATED,
                "Reservation Confirmed",
                "Your reservation for \"" + book.getTitle() + "\" is confirmed. Queue position: #"
                        + saved.getQueuePosition() + ". Estimated wait: " + estimateWaitDays(nextPosition - 1) + " day(s).",
                "/reservations");
        mailService.send(user.getEmail(), "Reservation Confirmed",
                "Dear " + user.getName() + ",\n\n"
                        + "Your reservation for \"" + book.getTitle() + "\" is confirmed.\n"
                        + "Reservation number: " + saved.getReservationNumber() + "\n"
                        + "Queue position: #" + saved.getQueuePosition() + "\n"
                        + "Estimated wait: " + estimateWaitDays(nextPosition - 1) + " day(s).\n\n"
                        + "You will be notified when the book is ready for pickup.\n\n— Lumina Library");

        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<ReservationDTO> getMyReservations(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
        return reservationRepository.findByUserOrderByReservationDateDesc(user)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return reservationRepository.findByUserOrderByReservationDateDesc(user)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ReservationDTO getReservationById(Long id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation", id));
        return toDTO(reservation);
    }

    @Transactional
    public void cancelReservation(Long reservationId, String userEmail) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation", reservationId));

        boolean isAdmin = false;
        try {
            User user = userRepository.findByEmail(userEmail).orElse(null);
            if (user != null && user.getRole() == User.Role.ADMIN) {
                isAdmin = true;
            }
        } catch (Exception ignored) {}

        if (!isAdmin && !reservation.getUser().getEmail().equals(userEmail)) {
            throw new BusinessException("You can only cancel your own reservations.");
        }

        if (!Reservation.STATUS_PENDING.equals(reservation.getStatus())
                && !Reservation.STATUS_READY.equals(reservation.getStatus())) {
            throw new BusinessException("This reservation can no longer be cancelled.");
        }

        boolean wasReady = Reservation.STATUS_READY.equals(reservation.getStatus());

        reservation.setStatus(Reservation.STATUS_CANCELLED);
        reservation.setNotes(wasReady ? "Cancelled after pickup notification" : null);
        reservationRepository.save(reservation);

        notificationService.notify(reservation.getUser(), Notification.TYPE_RESERVATION_CANCELLED,
                "Reservation Cancelled",
                "Reservation " + reservation.getReservationNumber() + " for \"" + reservation.getBook().getTitle()
                        + "\" was cancelled.",
                "/reservations");
        mailService.send(reservation.getUser().getEmail(), "Reservation Cancelled",
                "Dear " + reservation.getUser().getName() + ",\n\nYour reservation "
                        + reservation.getReservationNumber() + " for \"" + reservation.getBook().getTitle()
                        + "\" was cancelled.\n\n— Lumina Library");

        reorderQueue(reservation.getBook(), reservation.getQueuePosition());
        log.info("Reservation id={} cancelled by user id={}", reservationId, reservation.getUser().getId());
    }

    @Transactional
    public void fulfillNextInQueue(Book book) {
        Optional<Reservation> next = reservationRepository
                .findTopByBookAndStatusOrderByQueuePosition(book, Reservation.STATUS_PENDING);
        if (next.isEmpty()) return;

        Reservation reservation = next.get();
        boolean wasNotified = Boolean.TRUE.equals(reservation.getNotificationSent());
        reservation.setStatus(Reservation.STATUS_READY);
        reservation.setPickupExpiryDate(LocalDateTime.now().plusHours(Reservation.HOLD_HOURS));
        reservation.setNotificationSent(true);
        reservationRepository.save(reservation);

        if (!wasNotified) {
            notificationService.notify(reservation.getUser(), Notification.TYPE_RESERVATION_READY,
                    "Book Ready for Pickup",
                    "Your reserved book \"" + book.getTitle() + "\" is now available. Pick it up by "
                            + reservation.getPickupExpiryDate()
                            + " (reservation " + reservation.getReservationNumber() + "), or it will be released to the next person.",
                    "/reservations");
            mailService.send(reservation.getUser().getEmail(), "Book Ready for Pickup",
                    "Dear " + reservation.getUser().getName() + ",\n\n"
                            + "Good news! Your reserved book \"" + book.getTitle() + "\" is now available.\n"
                            + "Please pick it up by " + reservation.getPickupExpiryDate() + ".\n"
                            + "If not collected in time, the reservation will expire and be released to the next person.\n\n— Lumina Library");
        }

        log.info("Reservation id={} fulfilled for book id={}, ready for pickup until {}, queue was #{}",
                reservation.getId(), book.getId(), reservation.getPickupExpiryDate(),
                reservation.getQueuePosition());
    }

    @Transactional
    public void markAsPickedUp(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation", reservationId));

        if (!Reservation.STATUS_READY.equals(reservation.getStatus())) {
            throw new BusinessException("Reservation is not ready for pickup.");
        }

        Book book = reservation.getBook();
        User user = reservation.getUser();

        boolean alreadyBorrowed = issuedBookRepository
                .findByUserAndBookAndStatus(user, book, IssuedBook.STATUS_ISSUED)
                .isPresent();

        if (!alreadyBorrowed) {
            if (book.getAvailableCopies() == null || book.getAvailableCopies() <= 0) {
                throw new BusinessException(
                        "No copies available to issue. The reserved copy may have been borrowed by another user.");
            }

            UserSubscription sub = subscriptionService.getActiveSubscription(user)
                    .orElseThrow(() -> new BusinessException("No active subscription."));

            LocalDate issueDate = LocalDate.now();
            LocalDate dueDate = issueDate.plusDays(sub.getPlan().getMaxLoanDays());

            IssuedBook issued = IssuedBook.builder()
                    .book(book)
                    .user(user)
                    .issueDate(issueDate)
                    .dueDate(dueDate)
                    .status(IssuedBook.STATUS_ISSUED)
                    .build();
            issuedBookRepository.save(issued);

            book.setAvailableCopies(book.getAvailableCopies() - 1);
            bookRepository.save(book);

            log.info("Reservation id={} picked up: IssuedBook created for user id={}, due={}",
                    reservationId, user.getId(), dueDate);
        } else {
            log.info("Reservation id={} picked up: book already borrowed by user id={}",
                    reservationId, user.getId());
        }

        reservation.setStatus(Reservation.STATUS_FULFILLED);
        reservation.setCompletedAt(LocalDateTime.now());
        reservationRepository.save(reservation);

        notificationService.notify(reservation.getUser(), Notification.TYPE_RESERVATION_COMPLETED,
                "Reservation Completed",
                "Reservation " + reservation.getReservationNumber() + " for \"" + book.getTitle()
                        + "\" has been completed. Enjoy your reading!",
                "/reservations");
        mailService.send(reservation.getUser().getEmail(), "Reservation Completed",
                "Dear " + reservation.getUser().getName() + ",\n\n"
                        + "Reservation " + reservation.getReservationNumber() + " for \"" + book.getTitle()
                        + "\" has been completed. The book has been issued to you. Enjoy your reading!\n\n— Lumina Library");

        if (book.getAvailableCopies() != null && book.getAvailableCopies() > 0) {
            fulfillNextInQueue(book);
        }
    }

    @Transactional
    public void autoCloseReservation(User user, Long bookId) {
        Book book = bookRepository.getReferenceById(bookId);
        reservationRepository.findByBookAndUserAndStatusIn(book, user,
                List.of(Reservation.STATUS_READY)).stream()
                .findFirst()
                .ifPresent(reservation -> {
                    reservation.setStatus(Reservation.STATUS_FULFILLED);
                    reservation.setCompletedAt(LocalDateTime.now());
                    reservationRepository.save(reservation);
                    log.info("Reservation id={} auto-closed on borrow by user id={}",
                            reservation.getId(), user.getId());
                });
    }

    @Transactional
    public void approveReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation", reservationId));
        if (!Reservation.STATUS_PENDING.equals(reservation.getStatus())) {
            throw new BusinessException("Only WAITING reservations can be approved.");
        }
        reservation.setStatus(Reservation.STATUS_READY);
        reservation.setPickupExpiryDate(LocalDateTime.now().plusHours(Reservation.HOLD_HOURS));
        reservation.setNotificationSent(true);
        reservationRepository.save(reservation);

        notificationService.notify(reservation.getUser(), Notification.TYPE_RESERVATION_READY,
                "Book Ready for Pickup",
                "Your reserved book \"" + reservation.getBook().getTitle() + "\" is now available. Pick it up by "
                        + reservation.getPickupExpiryDate() + ".",
                "/reservations");
        mailService.send(reservation.getUser().getEmail(), "Book Ready for Pickup",
                "Dear " + reservation.getUser().getName() + ",\n\n"
                        + "Your reserved book \"" + reservation.getBook().getTitle() + "\" is now available. "
                        + "Please pick it up by " + reservation.getPickupExpiryDate() + ".\n\n— Lumina Library");

        log.info("Reservation id={} approved (WAITING->READY) by admin", reservationId);
    }

    @Transactional
    public void adminCancelReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation", reservationId));
        if (Reservation.STATUS_FULFILLED.equals(reservation.getStatus())) {
            throw new BusinessException("Cannot cancel a completed reservation.");
        }
        if (Reservation.STATUS_CANCELLED.equals(reservation.getStatus())) {
            throw new BusinessException("Reservation is already cancelled.");
        }
        reservation.setStatus(Reservation.STATUS_CANCELLED);
        reservation.setCompletedAt(LocalDateTime.now());
        reservationRepository.save(reservation);

        notificationService.notify(reservation.getUser(), Notification.TYPE_RESERVATION_CANCELLED,
                "Reservation Cancelled",
                "Reservation " + reservation.getReservationNumber() + " for \""
                        + reservation.getBook().getTitle() + "\" was cancelled by the library.",
                "/reservations");
        mailService.send(reservation.getUser().getEmail(), "Reservation Cancelled",
                "Dear " + reservation.getUser().getName() + ",\n\nReservation "
                        + reservation.getReservationNumber() + " for \"" + reservation.getBook().getTitle()
                        + "\" was cancelled by the library.\n\n— Lumina Library");

        reorderQueue(reservation.getBook(), reservation.getQueuePosition());
        log.info("Reservation id={} cancelled by admin", reservationId);
    }

    @Transactional
    public void expireOverduePickups() {
        List<Reservation> expired = reservationRepository.findExpiredPickups(
                Reservation.STATUS_READY, LocalDateTime.now());
        for (Reservation reservation : expired) {
            reservation.setStatus(Reservation.STATUS_EXPIRED);
            reservation.setCompletedAt(LocalDateTime.now());
            reservationRepository.save(reservation);

            notificationService.notify(reservation.getUser(), Notification.TYPE_RESERVATION_EXPIRED,
                    "Reservation Expired",
                    "Reservation " + reservation.getReservationNumber() + " for \""
                            + reservation.getBook().getTitle() + "\" expired because it was not picked up in time.",
                    "/reservations");
            mailService.send(reservation.getUser().getEmail(), "Reservation Expired",
                    "Dear " + reservation.getUser().getName() + ",\n\nReservation "
                            + reservation.getReservationNumber() + " for \"" + reservation.getBook().getTitle()
                            + "\" expired because it was not picked up in time. The book has been released to the next person in the queue.\n\n— Lumina Library");

            fulfillNextInQueue(reservation.getBook());

            log.info("Reservation id={} expired - not picked up in time by user id={}",
                    reservation.getId(), reservation.getUser().getId());
        }
    }

    @Transactional
    public void changePickupTime(Long reservationId, LocalDateTime newExpiry) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation", reservationId));

        if (!Reservation.STATUS_READY.equals(reservation.getStatus())) {
            throw new BusinessException("Can only change pickup time for ready reservations.");
        }

        if (newExpiry.isBefore(LocalDateTime.now())) {
            throw new BusinessException("Pickup expiry must be in the future.");
        }

        reservation.setPickupExpiryDate(newExpiry);
        reservationRepository.save(reservation);

        log.info("Reservation id={} pickup expiry changed to {}", reservationId, newExpiry);
    }

    @Transactional
    public void overrideQueuePosition(Long reservationId, int newPosition) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation", reservationId));

        if (!Reservation.STATUS_PENDING.equals(reservation.getStatus())) {
            throw new BusinessException("Can only reorder pending reservations.");
        }

        List<Reservation> queue = reservationRepository
                .findByBookOrderByQueuePosition(reservation.getBook());
        List<Reservation> pending = queue.stream()
                .filter(r -> Reservation.STATUS_PENDING.equals(r.getStatus())
                        && !r.getId().equals(reservationId))
                .collect(Collectors.toList());

        pending.add(Math.min(newPosition - 1, pending.size()), reservation);

        int pos = 1;
        for (Reservation r : pending) {
            r.setQueuePosition(pos++);
            reservationRepository.save(r);
        }
        log.info("Reservation id={} queue position overridden to #{}", reservationId, newPosition);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getQueueInfo(Long bookId, Long reservationId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation", reservationId));

        int ahead = reservationRepository.countAheadInQueue(book, Reservation.STATUS_PENDING,
                reservation.getQueuePosition());
        int totalActive = reservationRepository.countByBookAndStatus(book, Reservation.STATUS_PENDING)
                + reservationRepository.countByBookAndStatus(book, Reservation.STATUS_READY);

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("queuePosition", reservation.getQueuePosition());
        info.put("ahead", ahead);
        info.put("totalActive", totalActive);
        info.put("estimatedWaitDays", estimateWaitDays(ahead));
        return info;
    }

    @Transactional(readOnly = true)
    public long getQueueLength(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        return reservationRepository.countByBookAndStatus(book, Reservation.STATUS_PENDING);
    }

    @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByBook(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        return reservationRepository.findByBookOrderByQueuePosition(book)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReservationDTO> getWaitingQueue(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        return reservationRepository
                .findByBookAndStatusInOrderByQueuePosition(book,
                        List.of(Reservation.STATUS_PENDING, Reservation.STATUS_READY))
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUserStats(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", reservationRepository.countByUser(user));
        stats.put("waiting", reservationRepository.countByUserAndStatus(user, Reservation.STATUS_PENDING));
        stats.put("readyForPickup", reservationRepository.countByUserAndStatus(user, Reservation.STATUS_READY));
        stats.put("completed", reservationRepository.countByUserAndStatus(user, Reservation.STATUS_FULFILLED));
        stats.put("cancelled", reservationRepository.countByUserAndStatus(user, Reservation.STATUS_CANCELLED));
        stats.put("expired", reservationRepository.countByUserAndStatus(user, Reservation.STATUS_EXPIRED));
        return stats;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAdminStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        long completed = reservationRepository.countByStatus(Reservation.STATUS_FULFILLED);
        long cancelled = reservationRepository.countByStatus(Reservation.STATUS_CANCELLED);
        long expired = reservationRepository.countByStatus(Reservation.STATUS_EXPIRED);

        stats.put("total", reservationRepository.count());
        stats.put("waiting", reservationRepository.countByStatus(Reservation.STATUS_PENDING));
        stats.put("readyForPickup", reservationRepository.countByStatus(Reservation.STATUS_READY));
        stats.put("completed", completed);
        stats.put("cancelled", cancelled);
        stats.put("expired", expired);

        long resolved = completed + cancelled + expired;
        stats.put("successRate", resolved == 0 ? 0.0 : Math.round((completed * 1000.0) / resolved) / 10.0);

        List<Reservation> done = reservationRepository.findByStatus(Reservation.STATUS_FULFILLED);
        if (done.isEmpty()) {
            stats.put("avgWaitHours", 0.0);
        } else {
            double avgHours = done.stream()
                    .filter(r -> r.getReservationDate() != null && r.getCompletedAt() != null)
                    .mapToDouble(r -> java.time.Duration.between(r.getReservationDate(), r.getCompletedAt()).toMinutes() / 60.0)
                    .average()
                    .orElse(0.0);
            stats.put("avgWaitHours", Math.round(avgHours * 10.0) / 10.0);
        }

        List<Map<String, Object>> topBooks = reservationRepository.countMostReservedBooks().stream()
                .limit(10)
                .map(row -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("bookId", row[0]);
                    entry.put("title", row[1]);
                    entry.put("reservationCount", row[2]);
                    return entry;
                })
                .collect(Collectors.toList());
        stats.put("mostReservedBooks", topBooks);

        stats.put("todayReservations", reservationRepository.countByReservationDateBetween(
                LocalDate.now().atStartOfDay(), LocalDate.now().plusDays(1).atStartOfDay()));

        List<LocalDateTime> recentDates = reservationRepository
                .findReservationDatesSince(LocalDateTime.now().minusMonths(12));

        Map<Integer, Long> byHour = recentDates.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(LocalDateTime::getHour, Collectors.counting()));
        stats.put("peakReservationHours", byHour.entrySet().stream()
                .sorted(Map.Entry.<Integer, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("hour", e.getKey());
                    entry.put("count", e.getValue());
                    return entry;
                })
                .collect(Collectors.toList()));

        Map<String, Long> byMonth = recentDates.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(d -> d.format(MONTH_FORMATTER), Collectors.counting()));
        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        LocalDate cursor = LocalDate.now().withDayOfMonth(1).minusMonths(11);
        for (int i = 0; i < 12; i++) {
            String key = cursor.format(MONTH_FORMATTER);
            monthlyTrend.add(Map.of("month", key, "count", byMonth.getOrDefault(key, 0L)));
            cursor = cursor.plusMonths(1);
        }
        stats.put("monthlyTrends", monthlyTrend);

        List<Map<String, Object>> topMembers = reservationRepository
                .countReservationsByTopMembers(List.of(Reservation.STATUS_PENDING, Reservation.STATUS_READY))
                .stream()
                .limit(5)
                .map(row -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("name", row[0]);
                    entry.put("count", row[1]);
                    return entry;
                })
                .collect(Collectors.toList());
        stats.put("topActiveMembers", topMembers);

        return stats;
    }

    @Transactional(readOnly = true)
    public List<ReservationDTO> getAllReservations(String status, String keyword,
                                                   String sortBy, String order) {
        String s = (status != null && !status.isEmpty()) ? status : null;
        String k = (keyword != null && !keyword.isEmpty()) ? keyword : null;
        Long numericId = null;
        if (k != null) {
            try {
                numericId = Long.parseLong(k.trim());
            } catch (NumberFormatException ignored) {}
        }
        return reservationRepository.searchReservations(s, k, numericId, buildSort(sortBy, order))
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationHistory(String keyword) {
        List<Reservation> reservations = reservationRepository.findByStatusNotIn(
                List.of(Reservation.STATUS_PENDING));
        if (keyword != null && !keyword.isBlank()) {
            reservations = reservations.stream()
                    .filter(r -> matchesKeyword(r, keyword.trim()))
                    .collect(Collectors.toList());
        }
        return reservations.stream()
                .filter(r -> !Reservation.STATUS_PENDING.equals(r.getStatus()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private boolean matchesKeyword(Reservation r, String keyword) {
        String q = keyword.toLowerCase();
        return (r.getReservationNumber() != null && r.getReservationNumber().toLowerCase().contains(q))
                || (r.getBook().getTitle() != null && r.getBook().getTitle().toLowerCase().contains(q))
                || (r.getUser().getName() != null && r.getUser().getName().toLowerCase().contains(q))
                || (r.getBook().getIsbn() != null && r.getBook().getIsbn().toLowerCase().contains(q))
                || String.valueOf(r.getId()).equals(keyword);
    }

    private Sort buildSort(String sortBy, String order) {
        Sort.Direction dir = "asc".equalsIgnoreCase(order) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String prop;
        switch (sortBy == null ? "" : sortBy) {
            case "queuePosition":
                prop = "queuePosition";
                break;
            case "bookTitle":
                prop = "book.title";
                break;
            case "memberName":
                prop = "user.name";
                break;
            case "reservationDate":
            default:
                prop = "reservationDate";
                break;
        }
        return Sort.by(dir, prop);
    }

    @Transactional
    public void adminExpireReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation", reservationId));
        if (!Reservation.STATUS_READY.equals(reservation.getStatus())) {
            throw new BusinessException("Only READY_FOR_PICKUP reservations can be expired.");
        }

        reservation.setStatus(Reservation.STATUS_EXPIRED);
        reservation.setCompletedAt(LocalDateTime.now());
        reservationRepository.save(reservation);

        notificationService.notify(reservation.getUser(), Notification.TYPE_RESERVATION_EXPIRED,
                "Reservation Expired",
                "Reservation " + reservation.getReservationNumber() + " for \""
                        + reservation.getBook().getTitle() + "\" expired because it was not picked up in time.",
                "/reservations");
        mailService.send(reservation.getUser().getEmail(), "Reservation Expired",
                "Dear " + reservation.getUser().getName() + ",\n\nReservation "
                        + reservation.getReservationNumber() + " for \"" + reservation.getBook().getTitle()
                        + "\" expired because it was not picked up in time. The book has been released to the next person in the queue.\n\n— Lumina Library");

        fulfillNextInQueue(reservation.getBook());
        log.info("Reservation id={} expired by admin", reservationId);
    }

    @Transactional
    public void deleteReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation", reservationId));
        if (!List.of(Reservation.STATUS_EXPIRED, Reservation.STATUS_CANCELLED,
                Reservation.STATUS_FULFILLED).contains(reservation.getStatus())) {
            throw new BusinessException("Only expired, cancelled or completed reservations can be deleted.");
        }
        reservationRepository.delete(reservation);
        log.info("Reservation id={} deleted by admin", reservationId);
    }

    private void reorderQueue(Book book, Integer cancelledPosition) {
        List<Reservation> queue = reservationRepository
                .findByBookOrderByQueuePosition(book);
        int newPos = 1;
        for (Reservation r : queue) {
            if (Reservation.STATUS_PENDING.equals(r.getStatus())
                    || Reservation.STATUS_READY.equals(r.getStatus())) {
                r.setQueuePosition(newPos++);
                reservationRepository.save(r);
            }
        }
    }

    private int estimateWaitDays(int peopleAhead) {
        if (peopleAhead <= 0) return 0;
        return peopleAhead * ESTIMATED_DAYS_PER_PERSON;
    }

    private String planName(User user) {
        return subscriptionService.getActiveSubscription(user)
                .map(sub -> sub.getPlan() != null ? sub.getPlan().getName() : null)
                .orElse(null);
    }

    private String generateReservationNumber(Long id) {
        return "RES-" + LocalDateTime.now().format(NUMBER_FORMATTER) + "-"
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    @Transactional
    public void sendPickupReminders() {
        LocalDateTime from = LocalDateTime.now();
        LocalDateTime to = from.plusHours(24);
        List<Reservation> due = reservationRepository
                .findPickupRemindersDue(Reservation.STATUS_READY, from, to);
        for (Reservation reservation : due) {
            reservation.setReminderSent(true);
            reservationRepository.save(reservation);

            notificationService.notify(reservation.getUser(), Notification.TYPE_PICKUP_REMINDER,
                    "Pickup Reminder",
                    "Reminder: your reserved book \"" + reservation.getBook().getTitle()
                            + "\" must be picked up by " + reservation.getPickupExpiryDate()
                            + ", otherwise the reservation will expire.",
                    "/reservations");
            mailService.send(reservation.getUser().getEmail(), "Pickup Reminder",
                    "Dear " + reservation.getUser().getName() + ",\n\n"
                            + "Reminder: your reserved book \"" + reservation.getBook().getTitle()
                            + "\" must be picked up by " + reservation.getPickupExpiryDate()
                            + ", otherwise the reservation will expire.\n\n— Lumina Library");

            log.info("Pickup reminder sent for reservation id={}", reservation.getId());
        }
    }

    private ReservationDTO toDTO(Reservation r) {
        int ahead = 0;
        if (r.getQueuePosition() != null && Reservation.STATUS_PENDING.equals(r.getStatus())) {
            ahead = reservationRepository.countAheadInQueue(
                    r.getBook(), Reservation.STATUS_PENDING, r.getQueuePosition());
        }

        Long loanId = null;
        if (Reservation.STATUS_FULFILLED.equals(r.getStatus())) {
            List<IssuedBook> loans = issuedBookRepository.findByUserAndBookOrderByIssueDateDesc(
                    r.getUser(), r.getBook());
            if (!loans.isEmpty()) {
                loanId = loans.get(0).getId();
            }
        }

        return ReservationDTO.builder()
                .id(r.getId())
                .reservationNumber(r.getReservationNumber())
                .userId(r.getUser().getId())
                .userName(r.getUser().getName())
                .userEmail(r.getUser().getEmail())
                .bookId(r.getBook().getId())
                .bookTitle(r.getBook().getTitle())
                .bookAuthor(r.getBook().getAuthor())
                .bookIsbn(r.getBook().getIsbn())
                .bookPublisher(r.getBook().getPublisher())
                .bookCoverImageUrl(r.getBook().getCoverImageUrl())
                .bookShelf(r.getBook().getShelfLocation())
                .bookCategory(r.getBook().getCategory())
                .reservationDate(r.getReservationDate())
                .queuePosition(r.getQueuePosition())
                .status(r.getStatus())
                .pickupExpiryDate(r.getPickupExpiryDate())
                .completedAt(r.getCompletedAt())
                .notificationSent(r.getNotificationSent())
                .membershipPlanName(planName(r.getUser()))
                .estimatedWaitDays(estimateWaitDays(ahead))
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .loanId(loanId)
                .build();
    }
}
