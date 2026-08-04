package com.library.repository;

import com.library.entity.Book;
import com.library.entity.User;
import com.library.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<WishlistItem, Long> {

    List<WishlistItem> findByUserOrderByCreatedAtDesc(User user);

    List<WishlistItem> findByUserOrderByCreatedAtAsc(User user);

    List<WishlistItem> findByUserOrderByPriorityDesc(User user);

    List<WishlistItem> findByUserAndBookCategoryOrderByCreatedAtDesc(User user, String category);

    List<WishlistItem> findByUserAndBookAuthorContainingIgnoreCaseOrderByCreatedAtDesc(User user, String author);

    Optional<WishlistItem> findByUserAndBook(User user, Book book);

    boolean existsByUserAndBook(User user, Book book);

    @Query("SELECT COUNT(w) FROM WishlistItem w")
    long countTotal();

    @Query("SELECT COUNT(w) FROM WishlistItem w WHERE w.book.availableCopies > 0")
    long countAvailable();

    @Query("SELECT COUNT(w) FROM WishlistItem w WHERE w.book.id IN (SELECT r.book.id FROM Reservation r WHERE r.status = 'PENDING')")
    long countReserved();

    @Query("SELECT w.book, COUNT(w) as cnt FROM WishlistItem w GROUP BY w.book ORDER BY cnt DESC")
    List<Object[]> findMostWishlistedBooks();

    @Query("SELECT w.book.category, COUNT(w) FROM WishlistItem w GROUP BY w.book.category ORDER BY COUNT(w) DESC")
    List<Object[]> countByCategory();

    @Query("SELECT w FROM WishlistItem w WHERE w.book.availableCopies > 0 AND w.notifyWhenAvailable = true AND w.createdAt > :since")
    List<WishlistItem> findAvailableWithNotification(@Param("since") LocalDateTime since);

    @Query("SELECT w FROM WishlistItem w WHERE w.borrowedAt IS NULL AND w.book.availableCopies > 0")
    List<WishlistItem> findUnborrowedAvailable();

    List<WishlistItem> findByUserAndNotifyWhenAvailableTrue(User user);

    @Query("SELECT w FROM WishlistItem w WHERE w.user = :user AND " +
           "(:category IS NULL OR w.book.category = :category) AND " +
           "(:author IS NULL OR LOWER(w.book.author) LIKE LOWER(CONCAT('%', :author, '%')))")
    List<WishlistItem> findByFilters(@Param("user") User user,
                                      @Param("category") String category,
                                      @Param("author") String author);
}
