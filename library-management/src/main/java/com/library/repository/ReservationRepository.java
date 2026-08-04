package com.library.repository;

import com.library.entity.Book;
import com.library.entity.Reservation;
import com.library.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Sort;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByUserOrderByReservationDateDesc(User user);

    List<Reservation> findByBookOrderByQueuePosition(Book book);

    Optional<Reservation> findByBookAndUserAndStatus(Book book, User user, String status);

    @Query("SELECT r FROM Reservation r WHERE r.book = :book AND r.user = :user AND r.status IN :statuses")
    List<Reservation> findByBookAndUserAndStatusIn(@Param("book") Book book, @Param("user") User user, @Param("statuses") List<String> statuses);

    int countByBookAndStatus(Book book, String status);

    Optional<Reservation> findTopByBookAndStatusOrderByQueuePosition(Book book, String status);

    List<Reservation> findByStatus(String status);

    long countByStatus(String status);

    long countByUserAndStatus(User user, String status);

    long countByUser(User user);

    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.user = :user AND r.status IN :statuses")
    long countByUserAndStatusIn(@Param("user") User user, @Param("statuses") List<String> statuses);

    @Query("SELECT r FROM Reservation r WHERE r.status = :status AND r.pickupExpiryDate < :now")
    List<Reservation> findExpiredPickups(@Param("status") String status, @Param("now") LocalDateTime now);

    @Query("SELECT r FROM Reservation r WHERE r.status = :status ORDER BY r.queuePosition ASC")
    List<Reservation> findQueueByStatus(@Param("status") String status);

    @Query("SELECT r FROM Reservation r WHERE r.status IN :statuses ORDER BY r.reservationDate DESC")
    List<Reservation> findByStatusIn(@Param("statuses") List<String> statuses);

    @Query("SELECT r FROM Reservation r WHERE " +
           "(:status IS NULL OR r.status = :status) AND " +
           "(:numericId IS NULL OR r.id = :numericId) AND " +
           "(:keyword IS NULL OR LOWER(r.book.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.user.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(r.book.isbn) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Reservation> searchReservations(@Param("status") String status,
                                          @Param("keyword") String keyword,
                                          @Param("numericId") Long numericId,
                                          Sort sort);

    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.book = :book AND r.status = :status AND r.queuePosition < :position")
    int countAheadInQueue(@Param("book") Book book, @Param("status") String status, @Param("position") Integer position);

    @Query("SELECT r FROM Reservation r WHERE r.status NOT IN :excluded ORDER BY r.reservationDate DESC")
    List<Reservation> findByStatusNotIn(@Param("excluded") List<String> excluded);

    @Query("SELECT r FROM Reservation r WHERE r.book = :book AND r.status IN :statuses ORDER BY r.queuePosition ASC")
    List<Reservation> findByBookAndStatusInOrderByQueuePosition(@Param("book") Book book, @Param("statuses") List<String> statuses);

    @Query("SELECT r FROM Reservation r WHERE r.user = :user AND r.status IN :statuses ORDER BY r.reservationDate DESC")
    List<Reservation> findByUserAndStatusInOrderByReservationDateDesc(@Param("user") User user, @Param("statuses") List<String> statuses);

    @Query("SELECT r.book.id AS bookId, r.book.title AS title, COUNT(r) AS reservationCount " +
           "FROM Reservation r GROUP BY r.book.id, r.book.title ORDER BY COUNT(r) DESC")
    List<Object[]> countMostReservedBooks();

    @Query("SELECT r FROM Reservation r WHERE r.status = :status AND r.notificationSent = true " +
           "AND r.reminderSent = false AND r.pickupExpiryDate BETWEEN :from AND :to")
    List<Reservation> findPickupRemindersDue(@Param("status") String status,
                                             @Param("from") LocalDateTime from,
                                             @Param("to") LocalDateTime to);

    long countByReservationDateBetween(LocalDateTime from, LocalDateTime to);

    @Query("SELECT r.reservationDate FROM Reservation r WHERE r.reservationDate >= :since")
    List<LocalDateTime> findReservationDatesSince(@Param("since") LocalDateTime since);

    @Query("SELECT r.user.name AS memberName, COUNT(r) AS cnt FROM Reservation r " +
           "WHERE r.status IN :statuses GROUP BY r.user.name ORDER BY COUNT(r) DESC")
    List<Object[]> countReservationsByTopMembers(@Param("statuses") List<String> statuses);
}
