package com.library.repository;

import com.library.entity.Fine;
import com.library.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FineRepository extends JpaRepository<Fine, Long> {

    List<Fine> findByUserOrderByCreatedAtDesc(User user);

    List<Fine> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Fine> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);

    List<Fine> findByStatusOrderByCreatedAtDesc(String status);

    List<Fine> findAllByOrderByCreatedAtDesc();

    long countByUserIdAndStatus(Long userId, String status);

    long countByUser_IdAndStatus(Long userId, String status);

    long countByUserAndStatus(User user, String status);

    boolean existsByIssuedBookIdAndStatus(Long issuedBookId, String status);
}

