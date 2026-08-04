package com.library.service;

import com.library.entity.Fine;
import com.library.entity.IssuedBook;
import com.library.entity.User;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.FineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FineService {

    private final FineRepository fineRepository;
    private final ReadingHistoryService readingHistoryService;

    @Value("${fine.rate-per-day:5}")
    private int fineRatePerDay;

    @Transactional
    public Fine generateOverdueFine(IssuedBook issuedBook) {
        if (issuedBook.getDueDate() == null) {
            return null;
        }
        LocalDate returnDate = issuedBook.getReturnDate() != null
                ? issuedBook.getReturnDate() : LocalDate.now();
        if (!returnDate.isAfter(issuedBook.getDueDate())) {
            return null;
        }
        long daysOverdue = ChronoUnit.DAYS.between(issuedBook.getDueDate(), returnDate);
        if (daysOverdue <= 0) {
            return null;
        }
        BigDecimal amount = BigDecimal.valueOf(daysOverdue).multiply(BigDecimal.valueOf(fineRatePerDay));
        Fine fine = Fine.builder()
                .issuedBook(issuedBook)
                .user(issuedBook.getUser())
                .amount(amount)
                .reason(Fine.REASON_OVERDUE)
                .status(Fine.STATUS_UNPAID)
                .build();
        return fineRepository.save(fine);
    }

    public List<Fine> getFinesByUser(Long userId) {
        return fineRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Fine> getAllFines() {
        return fineRepository.findAllByOrderByCreatedAtDesc();
    }

    public Fine getFineById(Long id) {
        return fineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fine", id));
    }

    public long getOutstandingFineCount(Long userId) {
        return fineRepository.countByUser_IdAndStatus(userId, Fine.STATUS_UNPAID);
    }

    public BigDecimal getOutstandingFineAmount(Long userId) {
        return fineRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, Fine.STATUS_UNPAID).stream()
                .map(Fine::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public void markFineAsPaid(Long fineId) {
        Fine fine = getFineById(fineId);
        fine.setStatus(Fine.STATUS_PAID);
        fine.setPaidDate(LocalDate.now().atStartOfDay());
        fineRepository.save(fine);

        if (fine.getIssuedBook() != null) {
            readingHistoryService.markFinePaid(fine.getIssuedBook());
        }
    }

    @Transactional
    public Fine waiveFine(Long fineId, User admin, String reason) {
        Fine fine = getFineById(fineId);
        fine.setStatus(Fine.STATUS_WAIVED);
        fine.setWaivedBy(admin.getId());
        fine.setWaivedReason(reason);
        fine.setWaivedDate(LocalDate.now().atStartOfDay());
        return fineRepository.save(fine);
    }
}
