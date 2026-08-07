package com.library.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class HomeStatsDto {

    long books;
    long members;
    long borrowedBooks;
    long reservations;
    long satisfaction;
    long categories;
}
