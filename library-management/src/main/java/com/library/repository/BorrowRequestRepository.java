package com.library.repository;

import com.library.entity.Book;
import com.library.entity.BorrowRequest;
import com.library.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BorrowRequestRepository extends JpaRepository<BorrowRequest, Long> {

    List<BorrowRequest> findByUserOrderByRequestDateDesc(User user);

    List<BorrowRequest> findAllByOrderByRequestDateDesc();

    List<BorrowRequest> findByStatusOrderByRequestDateDesc(String status);

    boolean existsByBookAndUserAndStatus(Book book, User user, String status);

    Optional<BorrowRequest> findFirstByBookAndUserAndStatusOrderByRequestDateDesc(Book book, User user, String status);

    long countByStatus(String status);

    long countByUserAndStatus(User user, String status);

    long countByStatusAndDecidedAtIsNotNull(String status);
}