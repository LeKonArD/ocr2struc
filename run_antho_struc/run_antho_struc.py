#!/usr/bin/env python3

import argparse
from antho_lib import helper_tools
from antho_lib import parse_xml
from antho_lib import transformations
from antho_lib import experimental

# parse input arguments
parser = argparse.ArgumentParser()
parser.add_argument('-inputfolder', default=None, type=str)
args = parser.parse_args()

input_folder = args.inputfolder

# productive part
file_paths = helper_tools.get_file_paths_from_dir(input_folder)
book_line_table = parse_xml.parse_pagexml(file_paths)

book_line_table = transformations.to_relative_coords(book_line_table)
#experimental.umap_analysis(book_line_table)

#book_line_table.to_csv("book_test.tsv", sep="\t")
