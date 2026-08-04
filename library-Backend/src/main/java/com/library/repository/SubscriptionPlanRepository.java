package com.library.repository;

import com.library.entity.SubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Long> {

    List<SubscriptionPlan> findByStatusOrderByName(String status);

    boolean existsByName(String name);

    java.util.Optional<SubscriptionPlan> findByName(String name);
}
