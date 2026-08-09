package com.library.service;

import com.library.entity.SubscriptionPlan;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.repository.IssuedBookRepository;
import com.library.repository.PaymentTransactionRepository;
import com.library.repository.UserRepository;
import com.library.repository.UserSubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock
    private UserSubscriptionRepository userSubscriptionRepository;
    @Mock
    private SubscriptionPlanService planService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private IssuedBookRepository issuedBookRepository;
    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @InjectMocks
    private SubscriptionService subscriptionService;

    private User member() {
        return User.builder().id(10L).name("Alice").email("alice@example.com")
                .role(User.Role.MEMBER).active(true).build();
    }

    private SubscriptionPlan plan(Long id, String name, int price) {
        return SubscriptionPlan.builder().id(id).name(name).price(java.math.BigDecimal.valueOf(price))
                .validityDays(30).status(SubscriptionPlan.STATUS_ACTIVE).build();
    }

    private UserSubscription sub(Long id, User user, SubscriptionPlan plan, String status) {
        return UserSubscription.builder()
                .id(id).user(user).plan(plan)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(30))
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void activateSubscription_replacesExistingActiveMembership() {
        User user = member();
        SubscriptionPlan basic = plan(1L, "Basic", 99);
        SubscriptionPlan silver = plan(2L, "Silver", 899);
        UserSubscription oldActive = sub(1L, user, basic, UserSubscription.STATUS_ACTIVE);
        UserSubscription newSub = sub(2L, user, silver, UserSubscription.STATUS_PENDING);

        when(userSubscriptionRepository.findById(2L)).thenReturn(Optional.of(newSub));
        when(userSubscriptionRepository.findByUserAndStatusInOrderByCreatedAtDesc(
                eq(user), anyList())).thenReturn(List.of(oldActive));
        when(userSubscriptionRepository.save(any(UserSubscription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserSubscription activated = subscriptionService.activateSubscription(2L, "LIB123", "PAY123");

        assertEquals(UserSubscription.STATUS_ACTIVE, activated.getStatus());
        assertEquals("PAY123", activated.getCashfreePaymentId());

        ArgumentCaptor<UserSubscription> saved = ArgumentCaptor.forClass(UserSubscription.class);
        verify(userSubscriptionRepository, times(2)).save(saved.capture());
        List<UserSubscription> savedAll = saved.getAllValues();
        assertTrue(savedAll.stream().anyMatch(s ->
                s.getId().equals(1L) && UserSubscription.STATUS_REPLACED.equals(s.getStatus())));
        assertTrue(savedAll.stream().anyMatch(s ->
                s.getId().equals(2L) && UserSubscription.STATUS_ACTIVE.equals(s.getStatus())));
    }

    @Test
    void activateSubscription_doesNotReplaceItselfOnRetry() {
        User user = member();
        SubscriptionPlan silver = plan(2L, "Silver", 899);
        UserSubscription activeSub = sub(2L, user, silver, UserSubscription.STATUS_ACTIVE);

        when(userSubscriptionRepository.findById(2L)).thenReturn(Optional.of(activeSub));
        when(userSubscriptionRepository.findByUserAndStatusInOrderByCreatedAtDesc(
                eq(user), anyList())).thenReturn(List.of(activeSub));
        when(userSubscriptionRepository.save(any(UserSubscription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserSubscription activated = subscriptionService.activateSubscription(2L, "LIB123", "PAY123");

        assertEquals(UserSubscription.STATUS_ACTIVE, activated.getStatus());
        verify(userSubscriptionRepository).save(activeSub);
        assertEquals(UserSubscription.STATUS_ACTIVE, activeSub.getStatus());
    }
}
