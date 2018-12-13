#!/usr/bin/env python3

import pandas as pd

def get_fontsize(book_table):

    book_table["fontsize"] = book_table.apply(lambda x: int(x["c6"]) - int(x["c2"]), axis=1)

    return book_table


def cut(x):

    if abs(x) > 1000:
        x = 0

    return x


def get_linespacing(book_table):

    book_table["spacing_upper"] = book_table["c6"] - \
                                  book_table["c6"].shift().fillna(0)

    book_table["spacing_lower"] = book_table["c6"].shift(periods=-1).fillna(0) - book_table["c6"]

    book_table["spacing_lower"] = book_table["spacing_lower"].apply(lambda x: cut(x))
    book_table["spacing_upper"] = book_table["spacing_upper"].apply(lambda x: cut(x))

    return book_table


def to_relative_coords(book_table):

    book_table = get_fontsize(book_table)
    book_table = get_linespacing(book_table)

    return book_table