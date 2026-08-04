package com.library.service;

import com.library.entity.Book;
import com.library.entity.IssuedBook;
import com.library.entity.User;
import com.library.entity.WishlistItem;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.BookRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.UserRepository;
import com.library.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;
    private final IssuedBookRepository issuedBookRepository;

    @Transactional(readOnly = true)
    public List<WishlistItem> getWishlist(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        return wishlistRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Transactional(readOnly = true)
    public List<WishlistItem> getFilteredWishlist(String userEmail, String category, String author,
                                                   String sort, String search) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));

        List<WishlistItem> items;
        boolean hasCategory = category != null && !category.isEmpty();
        boolean hasAuthor = author != null && !author.isEmpty();

        if (hasCategory || hasAuthor) {
            items = wishlistRepository.findByFilters(user,
                    hasCategory ? category : null,
                    hasAuthor ? author : null);
        } else {
            items = wishlistRepository.findByUserOrderByCreatedAtDesc(user);
        }

        if (search != null && !search.isEmpty()) {
            String q = search.toLowerCase();
            items = items.stream()
                    .filter(i -> i.getBook().getTitle().toLowerCase().contains(q)
                            || i.getBook().getAuthor().toLowerCase().contains(q)
                            || (i.getBook().getIsbn() != null && i.getBook().getIsbn().toLowerCase().contains(q))
                            || (i.getBook().getCategory() != null && i.getBook().getCategory().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }

        if (sort != null) {
            items = sortItems(items, sort);
        }

        return items;
    }

    private List<WishlistItem> sortItems(List<WishlistItem> items, String sort) {
        switch (sort) {
            case "newest":
                items.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
                break;
            case "oldest":
                items.sort((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()));
                break;
            case "priority":
                items.sort((a, b) -> priorityWeight(b.getPriority()) - priorityWeight(a.getPriority()));
                break;
            case "available":
                items.sort((a, b) -> {
                    int aAvail = a.getBook().getAvailableCopies() != null && a.getBook().getAvailableCopies() > 0 ? 0 : 1;
                    int bAvail = b.getBook().getAvailableCopies() != null && b.getBook().getAvailableCopies() > 0 ? 0 : 1;
                    return Integer.compare(aAvail, bAvail);
                });
                break;
            case "title_asc":
                items.sort((a, b) -> a.getBook().getTitle().compareToIgnoreCase(b.getBook().getTitle()));
                break;
            case "title_desc":
                items.sort((a, b) -> b.getBook().getTitle().compareToIgnoreCase(a.getBook().getTitle()));
                break;
            case "author_asc":
                items.sort((a, b) -> a.getBook().getAuthor().compareToIgnoreCase(b.getBook().getAuthor()));
                break;
            case "rating":
                items.sort((a, b) -> Double.compare(
                        b.getBook().getAverageRating() != null ? b.getBook().getAverageRating() : 0,
                        a.getBook().getAverageRating() != null ? a.getBook().getAverageRating() : 0));
                break;
        }
        return items;
    }

    private int priorityWeight(String priority) {
        if (WishlistItem.PRIORITY_HIGH.equals(priority)) return 3;
        if (WishlistItem.PRIORITY_MEDIUM.equals(priority)) return 2;
        if (WishlistItem.PRIORITY_LOW.equals(priority)) return 1;
        return 0;
    }

    @Transactional
    public WishlistItem addToWishlist(String userEmail, Long bookId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));

        if (wishlistRepository.existsByUserAndBook(user, book)) {
            throw new BusinessException("Book is already in your wishlist");
        }

        WishlistItem item = WishlistItem.builder()
                .user(user)
                .book(book)
                .priority(WishlistItem.PRIORITY_MEDIUM)
                .notifyWhenAvailable(false)
                .build();
        log.info("Book id={} added to wishlist by user id={}", bookId, user.getId());
        return wishlistRepository.save(item);
    }

    @Transactional
    public void removeFromWishlist(String userEmail, Long bookId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));

        wishlistRepository.findByUserAndBook(user, book)
                .ifPresent(w -> {
                    wishlistRepository.delete(w);
                    log.info("Book id={} removed from wishlist by user id={}", bookId, user.getId());
                });
    }

    @Transactional
    public WishlistItem updatePriority(String userEmail, Long bookId, String priority) {
        if (!List.of(WishlistItem.PRIORITY_HIGH, WishlistItem.PRIORITY_MEDIUM, WishlistItem.PRIORITY_LOW).contains(priority)) {
            throw new BusinessException("Invalid priority. Use HIGH, MEDIUM, or LOW");
        }
        WishlistItem item = getWishlistItem(userEmail, bookId);
        item.setPriority(priority);
        log.info("Wishlist item id={} priority set to {}", item.getId(), priority);
        return wishlistRepository.save(item);
    }

    @Transactional
    public WishlistItem updateNotes(String userEmail, Long bookId, String notes) {
        WishlistItem item = getWishlistItem(userEmail, bookId);
        item.setNotes(notes);
        return wishlistRepository.save(item);
    }

    @Transactional
    public WishlistItem toggleNotification(String userEmail, Long bookId, boolean notify) {
        WishlistItem item = getWishlistItem(userEmail, bookId);
        item.setNotifyWhenAvailable(notify);
        log.info("Wishlist item id={} notification set to {}", item.getId(), notify);
        return wishlistRepository.save(item);
    }

    @Transactional
    public void markAsBorrowed(String userEmail, Long bookId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        wishlistRepository.findByUserAndBook(user, book).ifPresent(item -> {
            item.setBorrowedAt(LocalDateTime.now());
            wishlistRepository.save(item);
            log.info("Wishlist item id={} marked as borrowed", item.getId());
        });
    }

    @Transactional
    public void markAsReturned(String userEmail, Long bookId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        wishlistRepository.findByUserAndBook(user, book).ifPresent(item -> {
            item.setReturnedAt(LocalDateTime.now());
            wishlistRepository.save(item);
            log.info("Wishlist item id={} marked as returned", item.getId());
        });
    }

    @Transactional
    public void autoRemoveOnBorrow(String userEmail, Long bookId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        wishlistRepository.findByUserAndBook(user, book).ifPresent(item -> {
            item.setBorrowedAt(LocalDateTime.now());
            wishlistRepository.save(item);
            log.info("Wishlist item id={} auto-removed after borrow", item.getId());
        });
    }

    private WishlistItem getWishlistItem(String userEmail, Long bookId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        return wishlistRepository.findByUserAndBook(user, book)
                .orElseThrow(() -> new ResourceNotFoundException("WishlistItem", bookId));
    }

    public Map<String, Object> getWishlistStats(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        List<WishlistItem> items = wishlistRepository.findByUserOrderByCreatedAtDesc(user);

        long total = items.size();
        long availableNow = items.stream()
                .filter(i -> i.getBook().getAvailableCopies() != null && i.getBook().getAvailableCopies() > 0)
                .count();
        long borrowed = items.stream()
                .filter(i -> i.getBorrowedAt() != null)
                .count();
        long outOfStock = total - availableNow - borrowed;

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", total);
        stats.put("availableNow", availableNow);
        stats.put("reserved", borrowed);
        stats.put("outOfStock", Math.max(0, outOfStock));
        return stats;
    }

    public List<Map<String, Object>> getRecommendedBooks(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));

        List<WishlistItem> myItems = wishlistRepository.findByUserOrderByCreatedAtDesc(user);
        if (myItems.isEmpty()) {
            List<Book> popular = bookRepository.findAll().stream()
                    .sorted((a, b) -> {
                        double aRating = a.getAverageRating() != null ? a.getAverageRating() : 0;
                        double bRating = b.getAverageRating() != null ? b.getAverageRating() : 0;
                        return Double.compare(bRating, aRating);
                    })
                    .limit(4)
                    .collect(Collectors.toList());
            return popular.stream().map(this::toRecommendedMap).collect(Collectors.toList());
        }

        Map<String, Long> categoryCounts = myItems.stream()
                .filter(i -> i.getBook().getCategory() != null)
                .collect(Collectors.groupingBy(i -> i.getBook().getCategory(), Collectors.counting()));

        String topCategory = categoryCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        Set<Long> myBookIds = myItems.stream()
                .map(i -> i.getBook().getId())
                .collect(Collectors.toSet());

        List<Book> recommendations;
        if (topCategory != null) {
            recommendations = bookRepository.findByCategory(topCategory).stream()
                    .filter(b -> !myBookIds.contains(b.getId()))
                    .sorted((a, b) -> {
                        double aRating = a.getAverageRating() != null ? a.getAverageRating() : 0;
                        double bRating = b.getAverageRating() != null ? b.getAverageRating() : 0;
                        return Double.compare(bRating, aRating);
                    })
                    .limit(4)
                    .collect(Collectors.toList());
        } else {
            recommendations = bookRepository.findAll().stream()
                    .filter(b -> !myBookIds.contains(b.getId()))
                    .sorted((a, b) -> {
                        double aRating = a.getAverageRating() != null ? a.getAverageRating() : 0;
                        double bRating = b.getAverageRating() != null ? b.getAverageRating() : 0;
                        return Double.compare(bRating, aRating);
                    })
                    .limit(4)
                    .collect(Collectors.toList());
        }

        return recommendations.stream().map(this::toRecommendedMap).collect(Collectors.toList());
    }

    private Map<String, Object> toRecommendedMap(Book book) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", book.getId());
        map.put("title", book.getTitle());
        map.put("author", book.getAuthor());
        map.put("averageRating", book.getAverageRating());
        map.put("availableCopies", book.getAvailableCopies());
        map.put("coverImageUrl", book.getCoverImageUrl());
        map.put("category", book.getCategory());
        return map;
    }

    public Map<String, Object> getAdminAnalytics() {
        long totalWishlisted = wishlistRepository.countTotal();
        long totalAvailable = wishlistRepository.countAvailable();

        List<Object[]> mostWishlistedRaw = wishlistRepository.findMostWishlistedBooks();
        List<Map<String, Object>> mostWishlisted = mostWishlistedRaw.stream()
                .limit(5)
                .map(row -> {
                    Book book = (Book) row[0];
                    long count = (Long) row[1];
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", book.getId());
                    m.put("title", book.getTitle());
                    m.put("author", book.getAuthor());
                    m.put("count", count);
                    return m;
                })
                .collect(Collectors.toList());

        List<Object[]> categoryData = wishlistRepository.countByCategory();
        List<Map<String, Object>> demandByGenre = categoryData.stream()
                .map(row -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("category", row[0]);
                    m.put("count", row[1]);
                    return m;
                })
                .collect(Collectors.toList());

        List<WishlistItem> unborrowedAvailable = wishlistRepository.findUnborrowedAvailable();
        List<Map<String, Object>> neverBorrowed = unborrowedAvailable.stream()
                .limit(5)
                .map(w -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", w.getBook().getId());
                    m.put("title", w.getBook().getTitle());
                    m.put("author", w.getBook().getAuthor());
                    return m;
                })
                .collect(Collectors.toList());

        long conversionCount = wishlistRepository.findAll().stream()
                .filter(w -> w.getBorrowedAt() != null)
                .count();
        double conversionRate = totalWishlisted > 0
                ? Math.round(((double) conversionCount / totalWishlisted) * 10000.0) / 100.0
                : 0.0;

        Map<String, Object> analytics = new LinkedHashMap<>();
        analytics.put("totalWishlisted", totalWishlisted);
        analytics.put("availableNow", totalAvailable);
        analytics.put("conversionRate", conversionRate);
        analytics.put("mostWishlisted", mostWishlisted);
        analytics.put("demandByGenre", demandByGenre);
        analytics.put("neverBorrowed", neverBorrowed);
        return analytics;
    }
}