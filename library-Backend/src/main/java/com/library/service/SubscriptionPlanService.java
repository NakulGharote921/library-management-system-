package com.library.service;

import com.library.entity.SubscriptionPlan;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.SubscriptionPlanRepository;
import com.library.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionPlanService {

    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;

    private static final Comparator<SubscriptionPlan> PLAN_ORDER =
            Comparator.comparingInt(SubscriptionPlan::getDisplayOrder)
                    .thenComparing(SubscriptionPlan::getPrice);

    public List<SubscriptionPlan> getAllPlans() {
        return subscriptionPlanRepository.findAll().stream().sorted(PLAN_ORDER).toList();
    }

    public List<SubscriptionPlan> getActivePlans() {
        return subscriptionPlanRepository.findByStatus(SubscriptionPlan.STATUS_ACTIVE)
                .stream().sorted(PLAN_ORDER).toList();
    }

    public SubscriptionPlan getPlanById(Long id) {
        return subscriptionPlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SubscriptionPlan", id));
    }

    @Transactional
    public SubscriptionPlan createPlan(SubscriptionPlan plan) {
        if (subscriptionPlanRepository.existsByName(plan.getName())) {
            throw new BusinessException("Plan with name '" + plan.getName() + "' already exists");
        }
        return subscriptionPlanRepository.save(plan);
    }

    @Transactional
    public SubscriptionPlan updatePlan(Long id, SubscriptionPlan incoming) {
        log.info("Updating membership plan id={}", id);
        SubscriptionPlan existing = getPlanById(id);
        if (!existing.getName().equalsIgnoreCase(incoming.getName())
                && subscriptionPlanRepository.existsByName(incoming.getName())) {
            throw new BusinessException("Plan with name '" + incoming.getName() + "' already exists");
        }
        existing.setName(incoming.getName());
        existing.setDescription(incoming.getDescription());
        existing.setMaxBooks(incoming.getMaxBooks());
        existing.setMaxLoanDays(incoming.getMaxLoanDays());
        existing.setPrice(incoming.getPrice());
        existing.setValidityDays(incoming.getValidityDays());
        existing.setMaxRenewals(incoming.getMaxRenewals());
        existing.setMaxReservations(incoming.getMaxReservations());
        existing.setDisplayOrder(incoming.getDisplayOrder());
        existing.setFeatured(incoming.isFeatured());
        existing.setFeatures(incoming.getFeatures());
        existing.setPriorityReservation(incoming.isPriorityReservation());
        existing.setFineExempt(incoming.isFineExempt());
        existing.setStatus(incoming.getStatus());
        SubscriptionPlan saved = subscriptionPlanRepository.save(existing);
        log.info("Membership plan id={} updated", id);
        return saved;
    }

    @Transactional
    public void retirePlan(Long id) {
        log.info("Retiring membership plan id={}", id);
        SubscriptionPlan plan = getPlanById(id);
        plan.setStatus(SubscriptionPlan.STATUS_RETIRED);
        subscriptionPlanRepository.save(plan);
        log.info("Membership plan id={} retired", id);
    }

    @Transactional
    public void activatePlan(Long id) {
        log.info("Activating membership plan id={}", id);
        SubscriptionPlan plan = getPlanById(id);
        plan.setStatus(SubscriptionPlan.STATUS_ACTIVE);
        subscriptionPlanRepository.save(plan);
        log.info("Membership plan id={} activated", id);
    }

    @Transactional
    public void deletePlan(Long id) {
        log.info("Deleting membership plan id={}", id);
        SubscriptionPlan plan = getPlanById(id);
        if (userSubscriptionRepository.existsByPlanId(id)) {
            log.warn("Membership plan id={} is referenced by member subscriptions; refusing to delete", id);
            throw new BusinessException(HttpStatus.CONFLICT,
                    "This membership plan is currently assigned to members and cannot be deleted. Retire it instead.");
        }
        subscriptionPlanRepository.delete(plan);
        log.info("Membership plan id={} permanently deleted", id);
    }
}
