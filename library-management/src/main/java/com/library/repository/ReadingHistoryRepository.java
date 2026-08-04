package com.library.repository;

import com.library.entity.Book;
import com.library.entity.IssuedBook;
import com.library.entity.ReadingHistory;
import com.library.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReadingHistoryRepository extends JpaRepository<ReadingHistory, Long> {

    List<ReadingHistory> findByUserOrderByBorrowDateDesc(User user);

    List<ReadingHistory> findByUserAndStatusOrderByBorrowDateDesc(User user, String status);

    long countByUser(User user);

    long countByUserAndStatus(User user, String status);

    Optional<ReadingHistory> findByUserAndIssuedBook(User user, IssuedBook issuedBook);

    Optional<ReadingHistory> findByUserAndBookAndStatus(User user, Book book, String status);

    long countByUserAndStatusIn(User user, List<String> statuses);

    List<ReadingHistory> findByUserAndStatusInOrderByBorrowDateDesc(User user, List<String> statuses);
}
