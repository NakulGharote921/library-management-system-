package com.library.repository;

import com.library.entity.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long> {

    List<Book> findByTitleContainingIgnoreCase(String title);

    List<Book> findByCategory(String category);

    List<Book> findByAvailableCopiesGreaterThan(Integer copies);

    Optional<Book> findByIsbn(String isbn);

    @Query("SELECT b FROM Book b WHERE LOWER(b.title) LIKE LOWER(CONCAT('%', :k, '%')) OR LOWER(b.author) LIKE LOWER(CONCAT('%', :k, '%'))")
    List<Book> searchByTitleOrAuthor(@Param("k") String keyword);
}
