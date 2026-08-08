package com.library.repository;

import com.library.entity.User;
import com.library.entity.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {

    List<UserSubscription> findByUserOrderByCreatedAtDesc(User user);

    List<UserSubscription> findByStatusOrderByEndDateAsc(String status);

    Optional<UserSubscription> findTopByUserAndStatusOrderByEndDateDesc(User user, String status);

    Optional<UserSubscription> findTopByUserAndPlanIdAndStatusOrderByCreatedAtDesc(User user, Long planId, String status);

    @Query("SELECT us FROM UserSubscription us WHERE us.status = :status AND us.endDate < :date")
    List<UserSubscription> findExpiredSubscriptions(@Param("status") String status, @Param("date") LocalDate date);

    @Query("SELECT us FROM UserSubscription us WHERE us.status = :status AND us.endDate BETWEEN :from AND :to")
    List<UserSubscription> findExpiringSubscriptions(@Param("status") String status,
                                                      @Param("from") LocalDate from,
                                                      @Param("to") LocalDate to);

    long countByUserAndStatus(User user, String status);

    boolean existsByPlanId(Long planId);
}
