package com.library.repository;

import com.library.entity.Book;
import com.library.entity.IssuedBook;
import com.library.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface IssuedBookRepository extends JpaRepository<IssuedBook, Long> {

    @EntityGraph(attributePaths = {"book", "user"})
    List<IssuedBook> findAllByOrderByIssueDateDesc();

    @EntityGraph(attributePaths = {"book", "user"})
    List<IssuedBook> findByStatusOrderByIssueDateDesc(String status);

    List<IssuedBook> findByStatus(String status);

    List<IssuedBook> findByUser(User user);

    List<IssuedBook> findByBook(Book book);

    Optional<IssuedBook> findByUserAndBookAndStatus(User user, Book book, String status);

    @EntityGraph(attributePaths = {"book", "user"})
    List<IssuedBook> findByUser_IdOrderByIssueDateDesc(Long userId);

    @EntityGraph(attributePaths = {"book", "user"})
    List<IssuedBook> findByUser_IdAndStatus(Long userId, String status);

    long countByUser_IdAndStatus(Long userId, String status);

    long countByUser_IdAndStatusAndDueDateBefore(Long userId, String status, LocalDate date);

    @EntityGraph(attributePaths = {"book", "user"})
    List<IssuedBook> findByStatusAndDueDateBeforeOrderByDueDateAsc(String status, LocalDate date);

    @EntityGraph(attributePaths = {"book", "user"})
    List<IssuedBook> findTop5ByOrderByIssueDateDesc();

    @EntityGraph(attributePaths = {"book", "user"})
    @Query("SELECT ib FROM IssuedBook ib WHERE ib.id = :id")
    Optional<IssuedBook> findDetailedById(@Param("id") Long id);

    @Query("SELECT ib FROM IssuedBook ib WHERE ib.user = :user AND ib.book = :book ORDER BY ib.issueDate DESC")
    List<IssuedBook> findByUserAndBookOrderByIssueDateDesc(@Param("user") User user, @Param("book") Book book);
}
