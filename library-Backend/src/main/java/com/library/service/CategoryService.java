package com.library.service;

import com.library.dto.CategoryRequest;
import com.library.dto.CategoryDto;
import com.library.entity.Category;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.BookRepository;
import com.library.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final BookRepository bookRepository;

    @Transactional(readOnly = true)
    public List<CategoryDto> getAllCategories() {
        return categoryRepository.findAll().stream()
                .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryDto getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
        return toDto(category);
    }

    @Transactional
    public CategoryDto addCategory(CategoryRequest request) {
        String trimmed = request.getName().trim();
        if (categoryRepository.existsByNameIgnoreCase(trimmed)) {
            throw new BusinessException(HttpStatus.CONFLICT, "Category '" + trimmed + "' already exists");
        }
        Category category = Category.builder()
                .name(trimmed)
                .description(request.getDescription())
                .iconName(request.getIconName())
                .color(request.getColor())
                .build();
        return toDto(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDto updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
        String trimmed = request.getName().trim();
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(trimmed, id)) {
            throw new BusinessException(HttpStatus.CONFLICT, "Category '" + trimmed + "' already exists");
        }
        category.setName(trimmed);
        category.setDescription(request.getDescription());
        category.setIconName(request.getIconName());
        category.setColor(request.getColor());
        return toDto(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
        categoryRepository.delete(category);
    }

    private CategoryDto toDto(Category category) {
        return new CategoryDto(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getIconName(),
                category.getColor(),
                bookRepository.countByCategory(category.getName()),
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}
